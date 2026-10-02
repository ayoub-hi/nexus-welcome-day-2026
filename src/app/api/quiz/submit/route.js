import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError, withCors, corsPreflight, rateLimit } from "@/lib/api-utils";

const POINTS_PER_CORRECT = Number(process.env.QUIZ_POINTS_PER_CORRECT_ANSWER || 10);
// Small allowance for network/render latency between the client's local timer
// hitting zero and the request actually arriving. Not for the user's benefit
// on purpose - keep this small.
const SUBMIT_GRACE_MS = 5_000;

const submitSchema = z.object({
  // { "3": "A", "17": "D", ... } - question id (as string key) -> chosen option
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])),
});

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function POST(request) {
  const origin = request.headers.get("origin");

  const user = await requireUser();
  if (!user) return withCors(jsonError("Authentication required.", 401), origin);

  const { ok } = rateLimit(`quiz-submit:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!ok) return withCors(jsonError("Too many requests.", 429), origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonError("Invalid JSON body."), origin);
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(jsonError("Invalid input.", 422, { issues: parsed.error.flatten().fieldErrors }), origin);
  }

  const attempt = await prisma.quizAttempt.findUnique({ where: { userId: user.id } });
  if (!attempt) return withCors(jsonError("No quiz attempt found. Start the quiz first.", 400), origin);

  if (attempt.submittedAt) {
    return withCors(jsonError("This attempt has already been submitted.", 409), origin);
  }

  const now = new Date();
  const isLate = now.getTime() > attempt.expiresAt.getTime() + SUBMIT_GRACE_MS;

  const questionIds = JSON.parse(attempt.questionOrder);
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const correctById = new Map(questions.map((q) => [q.id, q.correctAnswer]));

  // Only ever grade against the question ids that were actually issued in this
  // attempt - answers for any other id (however they got there) are ignored.
  const submittedAnswers = parsed.data.answers;
  let correctCount = 0;
  const perQuestionResult = [];

  for (const id of questionIds) {
    const selected = submittedAnswers[String(id)] ?? null;
    const isCorrect = !isLate && selected !== null && selected === correctById.get(id);
    if (isCorrect) correctCount += 1;
    perQuestionResult.push({ id, selected, correct: isCorrect });
  }

  const score = isLate ? 0 : correctCount * POINTS_PER_CORRECT;

  await prisma.$transaction([
    prisma.quizAttempt.update({
      where: { userId: user.id },
      data: {
        submittedAt: now,
        score: correctCount,
        answers: JSON.stringify(submittedAnswers),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      // increment, not set - a user may already have bonus points
      // from before the event even started, and this must not erase them.
      data: { points: { increment: score }, played: true },
    }),
  ]);

  return withCors(
    NextResponse.json({
      late: isLate,
      correctCount,
      totalQuestions: questionIds.length,
      pointsAwarded: score,
      results: perQuestionResult,
    }),
    origin
  );
}
