import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError, withCors, corsPreflight } from "@/lib/api-utils";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function GET(request) {
  const origin = request.headers.get("origin");

  const admin = await requireAdmin();
  if (!admin) return withCors(jsonError("Admin access required.", 403), origin);

  const players = await prisma.user.findMany({
    where: { played: true },
    select: { id: true, username: true, name: true, points: true, year: true },
    orderBy: { points: "desc" },
    take: 200,
  });

  return withCors(NextResponse.json({ players }), origin);
}
