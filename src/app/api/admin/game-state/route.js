import { NextResponse } from "next/server";
import { z } from "zod";
import { GAME_STATUSES, setGameStatus, getGameStatus } from "@/lib/game-state";
import { requireAdmin, jsonError, withCors, corsPreflight } from "@/lib/api-utils";

const bodySchema = z.object({
  status: z.enum(GAME_STATUSES),
});

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function GET(request) {
  const origin = request.headers.get("origin");
  const admin = await requireAdmin();
  if (!admin) return withCors(jsonError("Admin access required.", 403), origin);

  const status = await getGameStatus();
  return withCors(NextResponse.json({ status }), origin);
}

export async function PATCH(request) {
  const origin = request.headers.get("origin");

  // Server-side check - never trust the client's session claim alone for
  // an authorization decision this sensitive.
  const admin = await requireAdmin();
  if (!admin) return withCors(jsonError("Admin access required.", 403), origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonError("Invalid JSON body."), origin);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return withCors(jsonError("Invalid status.", 422, { issues: parsed.error.flatten().fieldErrors }), origin);
  }

  const status = await setGameStatus(parsed.data.status);
  return withCors(NextResponse.json({ status }), origin);
}
