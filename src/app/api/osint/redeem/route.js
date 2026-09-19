import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getGameStatus } from "@/lib/game-state";
import { requireUser, jsonError, withCors, corsPreflight, rateLimit } from "@/lib/api-utils";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function POST(request) {
  const origin = request.headers.get("origin");

  const user = await requireUser();
  if (!user) return withCors(jsonError("Authentication required.", 401), origin);

  const gameStatus = await getGameStatus();
  if (gameStatus === "ended") {
    return withCors(jsonError("The event has ended - codes can no longer be redeemed.", 403), origin);
  }

  // A QuizAttempt row is created the moment /api/quiz/start runs, before
  // they've even seen a question - that's the "started" boundary the UI
  // warns about, so check for the row rather than `played` (which is only
  // set once they finish).
  const attempt = await prisma.quizAttempt.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (attempt) {
    return withCors(jsonError("You can't redeem codes after starting the quiz.", 403), origin);
  }

  const { ok } = rateLimit(`osint-redeem:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!ok) return withCors(jsonError("Too many attempts. Wait a bit and try again.", 429), origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonError("Invalid JSON body."), origin);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return withCors(jsonError("Enter a code first.", 422), origin);
  }

  // Codes are static, defined in prisma/osint-challenges.json, and matched exactly.
  const normalizedCode = parsed.data.code.trim().toUpperCase();

  const challenge = await prisma.osintChallenge.findUnique({ where: { code: normalizedCode } });
  if (!challenge) {
    return withCors(jsonError("That code isn't valid.", 404), origin);
  }

  // "Already redeemed" is scoped per user, not global - the same code is
  // shared by everyone who solved that challenge.
  const existing = await prisma.osintRedemption.findUnique({
    where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
  });
  if (existing) {
    return withCors(jsonError("You've already redeemed this code.", 409), origin);
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.osintRedemption.create({
      data: { userId: user.id, challengeId: challenge.id },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: challenge.points } },
    }),
  ]);

  return withCors(
    NextResponse.json({ pointsAwarded: challenge.points, totalPoints: updatedUser.points }),
    origin
  );
}
