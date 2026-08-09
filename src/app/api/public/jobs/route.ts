import { NextResponse } from "next/server";
import { listPublicOpenJobs } from "@/lib/services/directHire";

// GET /api/public/jobs — no auth required. The public job board.
export async function GET() {
  const jobs = await listPublicOpenJobs();
  return NextResponse.json({ jobs });
}
