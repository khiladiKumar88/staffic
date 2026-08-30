import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { createPlacement } from "@/lib/services/placements";

const createPlacementSchema = z.object({
  submissionId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  actualRate: z.number().positive(),
});

// POST /api/placements — client converts an APPROVED submission into a
// placement (also flips the requisition to FILLED).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPlacementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const placement = await createPlacement(session.user, {
      submissionId: parsed.data.submissionId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      actualRate: parsed.data.actualRate,
    });
    return NextResponse.json({ placement }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
