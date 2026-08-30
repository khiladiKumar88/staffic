export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Protect all dashboard and API routes (except Next.js internals and static files)
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
