import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Attach CORS headers to a response for a separately-hosted frontend. */
export function withCors(response, origin) {
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function corsPreflight(request) {
  const origin = request.headers.get("origin");
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return withCors(res, origin);
}

/**
 * Returns the authenticated user's fresh row from the database, or null.
 * Always use this (never the session/JWT claims alone) before making an
 * authorization decision like "has this user already played?" - a JWT can
 * be stale for its entire lifetime, but the DB is always current.
 */
export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

/** Like requireUser(), but also requires isAdmin - returns null for non-admins too. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!user || !user.isAdmin) return null;
  return user;
}

// --- Minimal in-memory rate limiter --------------------------------------
// Good enough for a single-instance deployment (e.g. one Docker container).
// If this ever runs across multiple serverless instances, swap this for a
// shared store (Redis/Upstash) - each instance would otherwise keep its own
// counters and the effective limit would be (limit * instance count).
const buckets = new Map();

export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

export function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
