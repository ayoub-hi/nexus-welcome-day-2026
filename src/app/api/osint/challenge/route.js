import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateOsintSession, attachOsintSessionCookie } from "@/lib/osint-session";
import { withCors, corsPreflight, rateLimit, getClientIp } from "@/lib/api-utils";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function GET(request) {
  const origin = request.headers.get("origin");

  const ip = getClientIp(request);
  const { ok } = rateLimit(`osint-challenge:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!ok) {
    return withCors(NextResponse.json({ error: "Too many requests." }, { status: 429 }), origin);
  }

  const sessionId = await getOrCreateOsintSession(request);

  const [challenges, solves] = await Promise.all([
    prisma.osintChallenge.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.osintSolve.findMany({ where: { sessionId }, select: { challengeId: true } }),
  ]);

  const solvedIds = new Set(solves.map((s) => s.challengeId));

  // First active challenge (in order) this session hasn't solved yet.
  const current = challenges.find((c) => !solvedIds.has(c.id)) || null;

  const body = {
    totalChallenges: challenges.length,
    completedCount: solvedIds.size,
    allDone: challenges.length > 0 && !current,
    currentChallenge: current ? { id: current.id, order: current.order, description: current.description } : null,
    // The code is static per challenge (same for every solver) - revealing
    // it here is fine, this session already proved it solved the challenge.
    earnedCodes: challenges
      .filter((c) => solvedIds.has(c.id))
      .map((c) => ({ order: c.order, code: c.code, points: c.points })),
  };

  const response = withCors(NextResponse.json(body), origin);
  return attachOsintSessionCookie(response, sessionId);
}
