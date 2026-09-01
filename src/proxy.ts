import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed middleware.ts -> proxy.ts (and the "middleware" export
// -> "proxy"). The proxy runtime is always Node.js now, not edge, so the
// edge-safe/no-Prisma split between auth.config.ts and auth.ts is no
// longer strictly required for this file to work, but it's kept anyway —
// it's still a clean boundary. This file's job is unchanged: redirect
// unauthenticated users away from protected routes. Real role/org checks
// still happen server-side in each route (see rbac.ts) — this is a UX
// guard, not the security boundary.
// Must be a plain default export, not a destructured/renamed named export —
// Next.js 16's proxy convention checks the export shape at build time and
// doesn't recognize `export const { auth: proxy } = NextAuth(...)` even
// though it's a valid function at runtime (this cost real debugging time,
// see docs/DECISIONS.md).
export default NextAuth(authConfig).auth;

export const config = {
  // V-03/V-04: protect all dashboard and API routes at the edge/proxy layer,
  // not just requisitions/submissions — every /api/* route needs a session
  // (public routes are excluded via auth.config.ts's authorized callback).
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
