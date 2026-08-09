import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createDirectHireJob, listDirectHireJobsForOrg } from "@/lib/services/directHire";

const createJobSchema = z.object({
  title: z.string().min(3),
  specialty: z.enum(["LOCUM_TENENS", "NURSING", "ALLIED_HEALTH", "NON_CLINICAL"]),
  location: z.string().min(1),
  description: z.string().optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await listDirectHireJobsForOrg(session.user);
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const job = await createDirectHireJob(session.user, parsed.data);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
