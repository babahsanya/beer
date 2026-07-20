import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * NextAuth v5 (Auth.js) configuration.
 *
 * Uses Prisma adapter + JWT session strategy. userId stored in token,
 * surfaced in session.user.id for API routes.
 *
 * Vars: AUTH_SECRET, AUTH_GITHUB_ID/SECRET, AUTH_GOOGLE_ID/SECRET.
 */

const providers: NextAuthConfig["providers"] = [];

if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    }),
  );
}

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (providers.length === 0) {
  console.warn(
    "⚠️  No OAuth providers configured. Set AUTH_GITHUB_ID/SECRET or " +
      "AUTH_GOOGLE_ID/SECRET in .env to enable authentication.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token?.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export type Session = Awaited<ReturnType<typeof auth>>;
