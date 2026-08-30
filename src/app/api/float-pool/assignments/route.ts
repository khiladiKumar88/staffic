import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { createFloatPoolAssignment, listFloatPoolAssignments } from "@/lib/services/floatPool";

const createAssignmentSchema = z.object({
  workerId: z.string().min(1),
  unit: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assignments = await listFloatPoolAssignments(session.user);
    return NextResponse.json({ assignments });
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
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const assignment = await createFloatPoolAssignment(session.user, {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
