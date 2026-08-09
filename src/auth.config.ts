import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

/**
 * Edge-safe auth config (no Prisma here — the adapter and DB-touching
 * Credentials.authorize() live in src/auth.ts, which only runs in the
 * Node runtime). This split is what lets middleware.ts check session
 * state on the edge without bundling Prisma.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/api/requisitions") ||
        request.nextUrl.pathname.startsWith("/api/submissions");

      if (isProtected && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      // On sign-in, `user` is the object returned from authorize() —
      // stash the fields we need on every request (organizationId, role)
      // so we never have to hit the DB just to check access.
      if (user) {
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  providers: [], // populated in src/auth.ts — kept empty here for edge compatibility
} satisfies NextAuthConfig;
