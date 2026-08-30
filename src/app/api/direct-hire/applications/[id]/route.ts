import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { updateJobApplicationStatus } from "@/lib/services/directHire";

const updateSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const application = await updateJobApplicationStatus(session.user, id, parsed.data.status);
    return NextResponse.json({ application });
  } catch (error) {
    return handleApiError(error);
  }
}
