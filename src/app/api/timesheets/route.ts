import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { createTimesheet, listTimesheetsForOrg } from "@/lib/services/timesheets";

const createTimesheetSchema = z.object({
  placementId: z.string().min(1),
  weekStartDate: z.string().datetime(),
  hoursWorked: z.number().positive().max(168),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const timesheets = await listTimesheetsForOrg(session.user);
    return NextResponse.json({ timesheets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createTimesheetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const timesheet = await createTimesheet(session.user, {
      ...parsed.data,
      weekStartDate: new Date(parsed.data.weekStartDate),
    });
    return NextResponse.json({ timesheet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
