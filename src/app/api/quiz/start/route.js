import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError, withCors, corsPreflight, rateLimit, getClientIp } from "@/lib/api-utils";

const QUIZ_DURATION_SECONDS = Number(process.env.QUIZ_DURATION_SECONDS || 213);

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Strip correctAnswer before this ever reaches JSON.stringify / the client. */
function toPublicQuestion(q) {
  return {
    id: q.id,
    question: q.question,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
  };
}

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function POST(request) {
  const origin = request.headers.get("origin");

  const user = await requireUser();
  if (!user) return withCors(jsonError("Authentication required.", 401), origin);

  const { ok } = rateLimit(`quiz-start:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!ok) return withCors(jsonError("Too many requests.", 429), origin);

  if (user.flagged) {
    return withCors(jsonError("Your account has been flagged and cannot play.", 403), origin);
  }

  if (user.played) {
    return withCors(jsonError("You have already played the quiz.", 403), origin);
  }

  const existing = await prisma.quizAttempt.findUnique({ where: { userId: user.id } });

  if (existing) {
    if (existing.submittedAt) {
      // Attempt was already finalized but user.played somehow wasn't set - fail closed.
      return withCors(jsonError("You have already played the quiz.", 403), origin);
    }

    const now = new Date();
    if (now > existing.expiresAt) {
      // They started but let the clock run out without submitting - close it out
      // server-side as a zero-score attempt so they can't get a second start.
      await prisma.$transaction([
        prisma.quizAttempt.update({
          where: { userId: user.id },
          data: { submittedAt: now, score: 0 },
        }),
        prisma.user.update({ where: { id: user.id }, data: { played: true } }),
      ]);
      return withCors(jsonError("Your previous attempt expired without being submitted.", 403), origin);
    }

    // Resume the in-progress attempt with its original timer - refreshing the
    // page must not grant more time, since expiresAt was fixed at creation.
    const ids = JSON.parse(existing.questionOrder);
    const questions = await prisma.question.findMany({ where: { id: { in: ids } } });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = ids.map((id) => toPublicQuestion(byId.get(id)));

    return withCors(
      NextResponse.json({
        attemptId: existing.id,
        startedAt: existing.startedAt,
        expiresAt: existing.expiresAt,
        questions: ordered,
      }),
      origin
    );
  }

  const pool = await prisma.question.findMany({ where: { active: true } });
  if (pool.length === 0) {
    return withCors(jsonError("No questions are configured yet.", 500), origin);
  }

  const shuffled = shuffle(pool);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + QUIZ_DURATION_SECONDS * 1000);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      questionOrder: JSON.stringify(shuffled.map((q) => q.id)),
      startedAt,
      expiresAt,
    },
  });

  return withCors(
    NextResponse.json({
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questions: shuffled.map(toPublicQuestion),
    }),
    origin
  );
}
