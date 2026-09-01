import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { rateLimit } from "@/lib/rate-limit";

// Login only needs "is this a non-empty string" — the 12-char/complexity
// policy (passwordSchema in lib/password.ts) applies when a password is
// being *created* (signup/invite accept), not when an existing account
// (including pre-policy seed accounts) is signing in. Enforcing the new
// policy here would lock out every account created before this rule
// existed, and would reject correct passwords before they ever reach the
// database/bcrypt check.
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Rate-limit login attempts per email — 5 tries per 15 min, then
        // 15-minute lockout (V-05 / V-20).
        const rl = rateLimit(`login:${email}`, 5, 15 * 60 * 1000, 15 * 60 * 1000);
        if (!rl.allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run bcrypt.compare even if user not found — prevents
        // timing-based email enumeration (V-13).
        const hash = user?.passwordHash ?? "$2a$12$fakehashfakehashfakehashfakehashfakehashfakehashfake";
        const passwordMatches = await bcrypt.compare(password, hash);
        if (!user || !passwordMatches) return null;

        // Shape returned here is what auth.config.ts's jwt() callback receives as `user`.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
        };
      },
    }),
  ],
});
