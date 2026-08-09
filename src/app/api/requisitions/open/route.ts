import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { listOpenRequisitions } from "@/lib/services/requisitions";

// GET /api/requisitions/open — the agency-facing marketplace: every OPEN
// requisition across every client org. Any authenticated, approved agency
// user can read this; it's intentionally not org-scoped to the caller.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requisitions = await listOpenRequisitions(session.user);
    return NextResponse.json({ requisitions });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
