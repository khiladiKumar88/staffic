import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { updateSubmissionStatus } from "@/lib/services/submissions";

const updateStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "INTERVIEW_REQUESTED", "APPROVED", "REJECTED"]),
});

// PATCH /api/submissions/:id — a client reviews a submission on one of
// their own requisitions.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const submission = await updateSubmissionStatus(session.user, id, parsed.data.status);
    return NextResponse.json({ submission });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
