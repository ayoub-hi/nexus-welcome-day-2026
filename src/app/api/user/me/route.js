import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { YEARS } from "@/lib/years";
import { requireUser, jsonError, withCors, corsPreflight } from "@/lib/api-utils";

const YEAR_CHOICES = YEARS;

// Deliberately narrow. The old Django serializer used fields = "__all__",
// which meant a PATCH to /auth/user/ could overwrite `points`, `played`,
// even `is_staff` if the view didn't block it. Here, "points" and "played"
// are never writable from this endpoint - they're only ever set by
// /api/quiz/submit, from server-side grading.
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
      .optional(),
    year: z.enum(YEAR_CHOICES).optional(),
  })
  .strict();

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    image: user.image,
    year: user.year,
    points: user.points,
    played: user.played,
  };
}

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function GET(request) {
  const origin = request.headers.get("origin");
  const user = await requireUser();
  if (!user) return withCors(jsonError("Authentication required.", 401), origin);
  return withCors(NextResponse.json({ user: toPublicUser(user) }), origin);
}

export async function PATCH(request) {
  const origin = request.headers.get("origin");
  const user = await requireUser();
  if (!user) return withCors(jsonError("Authentication required.", 401), origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonError("Invalid JSON body."), origin);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      jsonError("Invalid or disallowed field in request body.", 422, {
        issues: parsed.error.flatten().fieldErrors,
      }),
      origin
    );
  }

  // Year decides which question pool and which leaderboard a player belongs to,
  // so it is frozen once they've started (or finished) the quiz.
  if (parsed.data.year && parsed.data.year !== user.year) {
    const attempt = await prisma.quizAttempt.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (user.played || attempt) {
      return withCors(jsonError("You can't change your year after starting the quiz.", 403), origin);
    }
  }

  const updated = await prisma.user
    .update({
      where: { id: user.id },
      data: parsed.data,
    })
    .catch((e) => {
      if (e.code === "P2002") return "conflict";
      throw e;
    });

  if (updated === "conflict") {
    return withCors(jsonError("That username is already taken.", 409), origin);
  }

  return withCors(NextResponse.json({ user: toPublicUser(updated) }), origin);
}
