import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { createSubmission, listSubmissionsForAgency } from "@/lib/services/submissions";

const createSubmissionSchema = z.object({
  requisitionId: z.string().min(1),
  candidateId: z.string().min(1),
  proposedRate: z.number().positive(),
});

// GET /api/submissions — the caller's own agency's submissions across
// every requisition ("my submissions" tracker).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const submissions = await listSubmissionsForAgency(session.user);
    return NextResponse.json({ submissions });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/submissions — an agency recruiter submits a candidate against
// an open requisition belonging to a different (client) org.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const submission = await createSubmission(session.user, parsed.data);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
