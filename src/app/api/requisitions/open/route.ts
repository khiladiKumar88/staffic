import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
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
    return handleApiError(error);
  }
}
