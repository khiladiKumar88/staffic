import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { listSubmissionsForClientOrg, listSubmissionsForAgency } from "@/lib/services/submissions";
import { toCsv, csvResponse } from "@/lib/csv";

const COLUMNS = [
  "id",
  "candidateName",
  "requisitionTitle",
  "specialty",
  "counterpartyOrg",
  "proposedRate",
  "status",
  "placementStartDate",
  "actualRate",
  "createdAt",
];

// GET /api/reports/export/submissions — works for either side: a client
// exports submissions received, an agency exports submissions sent.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;

  try {
    let rows: Record<string, unknown>[];

    if (isClientRole(user)) {
      const submissions = await listSubmissionsForClientOrg(user);
      rows = submissions.map((s) => ({
        id: s.id,
        candidateName: s.candidate.name,
        requisitionTitle: s.requisition.title,
        specialty: s.requisition.specialty,
        counterpartyOrg: s.agencyOrg.name,
        proposedRate: s.proposedRate.toString(),
        status: s.status,
        placementStartDate: s.placement?.startDate.toISOString() ?? "",
        actualRate: s.placement?.actualRate.toString() ?? "",
        createdAt: s.createdAt.toISOString(),
      }));
    } else if (isAgencyRole(user)) {
      const submissions = await listSubmissionsForAgency(user);
      rows = submissions.map((s) => ({
        id: s.id,
        candidateName: s.candidate.name,
        requisitionTitle: s.requisition.title,
        specialty: s.requisition.specialty,
        counterpartyOrg: s.requisition.organization.name,
        proposedRate: s.proposedRate.toString(),
        status: s.status,
        placementStartDate: s.placement?.startDate.toISOString() ?? "",
        actualRate: s.placement?.actualRate.toString() ?? "",
        createdAt: s.createdAt.toISOString(),
      }));
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return csvResponse("submissions.csv", toCsv(rows, COLUMNS));
  } catch (error) {
    return handleApiError(error);
  }
}
