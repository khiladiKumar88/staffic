import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError } from "@/lib/rbac";
import { submitJobApplication } from "@/lib/services/directHire";

const applySchema = z.object({
  applicantName: z.string().min(2),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().optional(),
  coverNote: z.string().optional(),
});

// POST /api/public/jobs/:id/apply — no auth required. This is the one
// truly public write path in the app, so it's the one place spam/bot
// protection actually matters — see the honeypot + rate-limit comment
// above submitJobApplication in directHire.ts.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const honeypot = typeof body?.website === "string" ? body.website : undefined;

  try {
    const application = await submitJobApplication({ jobId: id, ...parsed.data, honeypot, ipAddress });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
