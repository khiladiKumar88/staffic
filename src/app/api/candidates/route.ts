import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { createCandidate, listCandidatesForOrg } from "@/lib/services/candidates";

const createCandidateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  credentials: z.array(z.string()).default([]),
});

// GET /api/candidates — the caller's own agency's candidate roster.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const candidates = await listCandidatesForOrg(session.user);
    return NextResponse.json({ candidates });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/candidates — agency adds a candidate to their roster.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const candidate = await createCandidate(session.user, parsed.data);
    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
