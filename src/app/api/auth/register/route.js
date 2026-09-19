import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, withCors, corsPreflight, rateLimit, getClientIp } from "@/lib/api-utils";

const YEAR_CHOICES = ["1cp", "2cp", "1cs", "2cs", "3cs"];

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .optional(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(80).optional(),
  year: z.enum(YEAR_CHOICES).optional(),
});

export async function OPTIONS(request) {
  return corsPreflight(request);
}

export async function POST(request) {
  const origin = request.headers.get("origin");

  // Registration is a juicy target for abuse (spam accounts, enumeration) - throttle it.
  const ip = getClientIp(request);
  const { ok } = rateLimit(`register:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!ok) {
    return withCors(jsonError("Too many attempts. Try again in a minute.", 429), origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonError("Invalid JSON body."), origin);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      jsonError("Invalid input.", 422, { issues: parsed.error.flatten().fieldErrors }),
      origin
    );
  }

  const { email, username, password, name, year } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(username ? [{ username }] : [])] },
    select: { id: true },
  });
  if (existing) {
    // Deliberately vague - don't reveal whether it was the email or username that collided.
    return withCors(jsonError("An account with that email or username already exists.", 409), origin);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: name || username,
      year,
      password: passwordHash,
    },
    select: { id: true, email: true, username: true, name: true, year: true },
  });

  return withCors(NextResponse.json({ user }, { status: 201 }), origin);
}
