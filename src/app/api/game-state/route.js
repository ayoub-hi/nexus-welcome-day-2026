import { NextResponse } from "next/server";
import { getGameStatus } from "@/lib/game-state";
import { withCors, corsPreflight, rateLimit, getClientIp } from "@/lib/api-utils";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function GET(request) {
  const origin = request.headers.get("origin");

  // This gets polled every few seconds by every waiting client, so the
  // limit here is generous compared to the other routes.
  const ip = getClientIp(request);
  const { ok } = rateLimit(`game-state:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!ok) {
    return withCors(NextResponse.json({ error: "Too many requests." }, { status: 429 }), origin);
  }

  const status = await getGameStatus();
  return withCors(NextResponse.json({ status }), origin);
}
