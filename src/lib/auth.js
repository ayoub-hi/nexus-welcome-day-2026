import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // required: Credentials provider can't use database sessions
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // No user, or an OAuth-only account with no password set -> reject.
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Only return what NextAuth needs for the token; never leak the hash.
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in and on every request that reads the token.
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    // Expose non-sensitive, DB-backed fields on the session object for convenience.
    // IMPORTANT: this is a read-time convenience only. Any endpoint that makes an
    // authorization decision (e.g. "has this user already played?") re-reads the
    // user from the DB itself rather than trusting these session claims, since a
    // JWT can go stale for the lifetime of the token.
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            username: true,
            points: true,
            played: true,
            year: true,
            flagged: true,
            isAdmin: true,
          },
        });
        if (dbUser) {
          Object.assign(session.user, dbUser);
        }
      }
      return session;
    },
  },
});
