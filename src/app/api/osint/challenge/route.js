import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateOsintSession, attachOsintSessionCookie } from "@/lib/osint-session";
import { jsonError, withCors, corsPreflight, rateLimit, getClientIp } from "@/lib/api-utils";

const querySchema = z.object({
  order: z.coerce.number().int().positive(),
});

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// Each of the 3 QR codes points at its own page, which asks for its own
// specific challenge by ?order=N - there's no "next unlocked challenge"
// concept anymore, since each QR code is independently discoverable
// (physically placed wherever), not meant to be solved in a forced order.
export async function GET(request) {
  const origin = request.headers.get("origin");

  const ip = getClientIp(request);
  const { ok } = rateLimit(`osint-challenge:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!ok) {
    return withCors(NextResponse.json({ error: "Too many requests." }, { status: 429 }), origin);
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ order: searchParams.get("order") });
  if (!parsed.success) {
    return withCors(jsonError("Missing or invalid challenge order.", 422), origin);
  }

  const sessionId = await getOrCreateOsintSession(request);

  const challenge = await prisma.osintChallenge.findUnique({ where: { order: parsed.data.order } });
  if (!challenge || !challenge.active) {
    const res = withCors(jsonError("This challenge isn't available.", 404), origin);
    return attachOsintSessionCookie(res, sessionId);
  }

  const solve = await prisma.osintSolve.findUnique({
    where: { sessionId_challengeId: { sessionId, challengeId: challenge.id } },
  });

  const body = {
    challenge: { id: challenge.id, order: challenge.order, description: challenge.description },
    solved: !!solve,
    // The code is static per challenge (same for every solver) - safe to
    // reveal here since this session already proved it solved it.
    code: solve ? challenge.code : null,
    points: challenge.points,
  };

  const response = withCors(NextResponse.json(body), origin);
  return attachOsintSessionCookie(response, sessionId);
}
