import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { YEARS } from "@/lib/years";
import { requireAdmin, jsonError, withCors, corsPreflight } from "@/lib/api-utils";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// GET /api/admin/scoreboard?year=1cp  -> players of that year only, best first.
// Without ?year it returns everyone (kept for backwards compatibility).
export async function GET(request) {
  const origin = request.headers.get("origin");

  const admin = await requireAdmin();
  if (!admin) return withCors(jsonError("Admin access required.", 403), origin);

  const year = new URL(request.url).searchParams.get("year");
  if (year && !YEARS.includes(year)) {
    return withCors(jsonError("Unknown year.", 400), origin);
  }

  const players = await prisma.user.findMany({
    where: { played: true, ...(year ? { year } : {}) },
    select: { id: true, username: true, name: true, points: true, year: true },
    orderBy: { points: "desc" },
    take: 200,
  });

  return withCors(NextResponse.json({ players, year: year || null }), origin);
}
