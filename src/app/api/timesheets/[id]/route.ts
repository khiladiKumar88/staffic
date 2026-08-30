import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { reviewTimesheet } from "@/lib/services/timesheets";

const reviewSchema = z.object({ approved: z.boolean() });

// PATCH /api/timesheets/:id — client approves or rejects a submitted timesheet.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const timesheet = await reviewTimesheet(session.user, id, parsed.data.approved);
    return NextResponse.json({ timesheet });
  } catch (error) {
    return handleApiError(error);
  }
}
