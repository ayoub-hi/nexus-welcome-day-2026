import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "osint_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days - covers the pre-event window

/**
 * Reads the anonymous session id from the request's cookie, verifying it
 * still exists in the DB. Creates a fresh one if missing/invalid. Returns
 * the session id - the caller is responsible for setting the cookie on its
 * response via attachOsintSessionCookie().
 */
export async function getOrCreateOsintSession(request) {
  const existingId = request.cookies.get(COOKIE_NAME)?.value;

  if (existingId) {
    const existing = await prisma.osintSession.findUnique({ where: { id: existingId } });
    if (existing) return existing.id;
  }

  const created = await prisma.osintSession.create({ data: {} });
  return created.id;
}

export function attachOsintSessionCookie(response, sessionId) {
  response.cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
