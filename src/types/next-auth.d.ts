import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

// Extend NextAuth's built-in types with our org-scoped, role-aware fields
// so `session.user.organizationId` / `session.user.role` are typed
// everywhere without casting.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: UserRole;
      // Our User.name column is a required, non-nullable String (see
      // schema.prisma) — NextAuth's DefaultSession types it as
      // `string | null | undefined` for the general OAuth-provider case,
      // which doesn't apply to us (credentials-only auth, always backed by
      // our own User row). Overriding here instead of null-checking
      // `user.name` at every call site across the dashboard.
      name: string;
    } & Omit<DefaultSession["user"], "name">;
  }

  interface User {
    organizationId: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    role?: UserRole;
  }
}
