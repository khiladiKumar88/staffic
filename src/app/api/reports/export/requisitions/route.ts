import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isClientRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { listRequisitionsForOrg } from "@/lib/services/requisitions";
import { toCsv, csvResponse } from "@/lib/csv";

// GET /api/reports/export/requisitions — client-side CSV export.
export async function GET() {
  const session = await auth();
  if (!session?.user || !isClientRole(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requisitions = await listRequisitionsForOrg(session.user);

    const csv = toCsv(
      requisitions.map((r) => ({
        id: r.id,
        title: r.title,
        specialty: r.specialty,
        location: r.location,
        rateMin: r.rateMin.toString(),
        rateMax: r.rateMax.toString(),
        status: r.status,
        submissionCount: r._count.submissions,
        createdAt: r.createdAt.toISOString(),
      })),
      ["id", "title", "specialty", "location", "rateMin", "rateMax", "status", "submissionCount", "createdAt"],
    );

    return csvResponse("requisitions.csv", csv);
  } catch (error) {
    return handleApiError(error);
  }
}
