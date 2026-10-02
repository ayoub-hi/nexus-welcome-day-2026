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

  const { ok } = rateLimit(`code-redeem:${user.id}`, { limit: 10, windowMs: 60_000 });
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

  const normalizedCode = parsed.data.code.trim().toUpperCase();

  const bonusCode = await prisma.bonusCode.findUnique({ where: { code: normalizedCode } });
  if (!bonusCode || !bonusCode.active) {
    return withCors(jsonError("That code isn't valid.", 404), origin);
  }

  const existing = await prisma.codeRedemption.findUnique({
    where: { userId_bonusCodeId: { userId: user.id, bonusCodeId: bonusCode.id } },
  });
  if (existing) {
    return withCors(jsonError("You've already redeemed this code.", 409), origin);
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.codeRedemption.create({
      data: { userId: user.id, bonusCodeId: bonusCode.id },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: bonusCode.points } },
    }),
  ]);

  return withCors(
    NextResponse.json({ pointsAwarded: bonusCode.points, totalPoints: updatedUser.points }),
    origin
  );
}
