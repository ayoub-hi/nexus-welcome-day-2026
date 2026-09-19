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

  const challenges = await prisma.osintChallenge.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { solves: true, redemptions: true } } },
  });

  const stats = challenges.map((c) => ({
    order: c.order,
    description: c.description,
    code: c.code,
    points: c.points,
    active: c.active,
    solved: c._count.solves,
    redeemed: c._count.redemptions,
  }));

  return withCors(NextResponse.json({ challenges: stats }), origin);
}
