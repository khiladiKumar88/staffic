import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createRequisition, listRequisitionsForOrg } from "@/lib/services/requisitions";

const createRequisitionSchema = z.object({
  title: z.string().min(3),
  specialty: z.enum(["LOCUM_TENENS", "NURSING", "ALLIED_HEALTH", "NON_CLINICAL"]),
  location: z.string().min(1),
  rateMin: z.number().positive(),
  rateMax: z.number().positive(),
  startDate: z.string().datetime().optional(),
  description: z.string().optional(),
});

// GET /api/requisitions — requisitions belonging to the caller's own org.
// Agencies browsing the open marketplace should use GET /api/requisitions/open.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requisitions = await listRequisitionsForOrg(session.user);
    return NextResponse.json({ requisitions });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

// POST /api/requisitions — client hiring managers/admins open a new req.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRequisitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const requisition = await createRequisition(session.user, {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    });
    return NextResponse.json({ requisition }, { status: 201 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
