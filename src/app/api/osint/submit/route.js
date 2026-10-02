import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateOsintSession, attachOsintSessionCookie } from "@/lib/osint-session";
import { isCorrectAnswer } from "@/lib/osint";
import { jsonError, withCors, corsPreflight, rateLimit, getClientIp } from "@/lib/api-utils";

const bodySchema = z.object({
  challengeId: z.number().int(),
  answer: z.string().trim().min(1).max(200),
});

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// No ordering requirement anymore - each challenge is reachable only via
// its own QR code/URL, so whichever one someone finds first is fair game.
export async function POST(request) {
  const origin = request.headers.get("origin");
  const sessionId = await getOrCreateOsintSession(request);

  // Two layers: per-IP catches "clear cookies and retry", per-session
  // catches rapid guessing within one browser.
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`osint-submit-ip:${ip}`, { limit: 30, windowMs: 10 * 60_000 });
  const sessionLimit = rateLimit(`osint-submit-session:${sessionId}`, { limit: 15, windowMs: 10 * 60_000 });
  if (!ipLimit.ok || !sessionLimit.ok) {
    const res = withCors(jsonError("Too many attempts. Wait a bit and try again.", 429), origin);
    return attachOsintSessionCookie(res, sessionId);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    const res = withCors(jsonError("Invalid JSON body."), origin);
    return attachOsintSessionCookie(res, sessionId);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const res = withCors(jsonError("Invalid input.", 422), origin);
    return attachOsintSessionCookie(res, sessionId);
  }

  const { challengeId, answer } = parsed.data;

  const challenge = await prisma.osintChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || !challenge.active) {
    const res = withCors(jsonError("This challenge isn't available.", 404), origin);
    return attachOsintSessionCookie(res, sessionId);
  }

  const correct = isCorrectAnswer(answer, challenge.answers);

  if (!correct) {
    const res = withCors(NextResponse.json({ correct: false }), origin);
    return attachOsintSessionCookie(res, sessionId);
  }

  try {
    await prisma.osintSolve.create({
      data: { sessionId, challengeId: challenge.id },
    });
  } catch (e) {
    // Unique constraint race (double-submit) - fine, someone else's request
    // already recorded the solve; proceed to return the same static code.
    if (e.code !== "P2002") throw e;
  }

  const res = withCors(
    NextResponse.json({ correct: true, code: challenge.code, points: challenge.points }),
    origin
  );
  return attachOsintSessionCookie(res, sessionId);
}
