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

  const codes = await prisma.bonusCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  const stats = codes.map((c) => ({
    code: c.code,
    label: c.label,
    points: c.points,
    active: c.active,
    redeemed: c._count.redemptions,
  }));

  return withCors(NextResponse.json({ codes: stats }), origin);
}
