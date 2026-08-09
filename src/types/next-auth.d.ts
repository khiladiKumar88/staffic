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
    } & DefaultSession["user"];
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
