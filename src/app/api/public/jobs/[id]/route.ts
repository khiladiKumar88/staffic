import { NextResponse } from "next/server";
import { getPublicJobDetail } from "@/lib/services/directHire";

// GET /api/public/jobs/:id — no auth required.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getPublicJobDetail(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}
