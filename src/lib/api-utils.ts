import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/rbac";

/**
 * Catch-all error handler for API routes.
 * Returns safe error responses — never exposes stack traces or DB schema.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  // Log the full error server-side, but return a generic message to the client
  console.error("[API Error]", error instanceof Error ? error.message : error);

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}
