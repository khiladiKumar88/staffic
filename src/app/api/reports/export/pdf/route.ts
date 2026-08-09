import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole, isPlatformAdmin } from "@/lib/rbac";
import {
  getClientSpecialtySummary,
  getAgencyScorecards,
  getAgencyFunnel,
  getMarketRateBenchmark,
  getPlatformOverview,
} from "@/lib/services/reports";
import { buildPdf, pdfResponse, type PdfSection } from "@/lib/pdf";

function fmtRate(n: number | null): string {
  return n === null ? "-" : `$${n.toFixed(2)}`;
}
function fmtPct(n: number | null): string {
  return n === null ? "-" : `${Math.round(n * 100)}%`;
}
function fmtDays(n: number | null): string {
  return n === null ? "-" : `${n.toFixed(1)}d`;
}
function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}
function label(specialty: string): string {
  return specialty.replaceAll("_", " ");
}

// GET /api/reports/export/pdf — a single-file PDF version of the role-
// appropriate Reports page, so there's a downloadable/shareable artifact
// beyond CSV. Hand-rolled (see src/lib/pdf.ts) rather than pulling in a
// PDF library, same reasoning as csv.ts.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;

  const sections: PdfSection[] = [];
  let title = "Staffic report";

  if (isClientRole(user)) {
    const [specialtySummary, scorecards, marketBenchmark] = await Promise.all([
      getClientSpecialtySummary(user),
      getAgencyScorecards(user),
      getMarketRateBenchmark(),
    ]);

    title = "Staffic - client report";

    sections.push({
      heading: "Requisitions by specialty",
      columns: ["Specialty", "Open", "Filled", "Total", "AvgProp", "AvgAct", "TimeToFill", "HrsBilled", "Spend"],
      columnWidths: [75, 32, 32, 32, 55, 55, 60, 55, 65],
      rows: specialtySummary.map((r) => [
        label(r.specialty),
        r.openCount,
        r.filledCount,
        r.requisitionCount,
        fmtRate(r.avgProposedRate),
        fmtRate(r.avgActualRate),
        fmtDays(r.avgTimeToFillDays),
        r.actualHoursBilled.toFixed(1),
        fmtMoney(r.actualSpend),
      ]),
    });

    sections.push({
      heading: "Agency scorecards",
      columns: ["Agency", "Submissions", "Approved", "Rejected", "ApprovalRate", "AvgProposed"],
      columnWidths: [150, 75, 65, 65, 80, 75],
      rows: scorecards.map((r) => [
        r.agencyName,
        r.totalSubmissions,
        r.approved,
        r.rejected,
        fmtPct(r.approvalRate),
        fmtRate(r.avgProposedRate),
      ]),
    });

    sections.push({
      heading: "Market rate benchmark (platform-wide)",
      columns: ["Specialty", "Submissions", "Min", "Avg", "Max", "AvgPlaced"],
      columnWidths: [95, 75, 60, 60, 60, 75],
      rows: marketBenchmark.map((r) => [
        label(r.specialty),
        r.submissionCount,
        fmtRate(r.minProposedRate),
        fmtRate(r.avgProposedRate),
        fmtRate(r.maxProposedRate),
        fmtRate(r.avgActualPlacementRate),
      ]),
    });
  } else if (isAgencyRole(user)) {
    const [funnel, marketBenchmark] = await Promise.all([getAgencyFunnel(user), getMarketRateBenchmark()]);

    title = "Staffic - agency report";

    sections.push({
      heading: "Your submission funnel",
      columns: ["Status", "Count"],
      columnWidths: [160, 80],
      rows: funnel.map((r) => [label(r.status), r.count]),
    });

    sections.push({
      heading: "Market rate benchmark (platform-wide)",
      columns: ["Specialty", "Submissions", "Min", "Avg", "Max", "AvgPlaced"],
      columnWidths: [95, 75, 60, 60, 60, 75],
      rows: marketBenchmark.map((r) => [
        label(r.specialty),
        r.submissionCount,
        fmtRate(r.minProposedRate),
        fmtRate(r.avgProposedRate),
        fmtRate(r.maxProposedRate),
        fmtRate(r.avgActualPlacementRate),
      ]),
    });
  } else if (isPlatformAdmin(user)) {
    const overview = await getPlatformOverview(user);

    title = "Staffic - platform overview";

    sections.push({
      heading: "Platform overview",
      columns: ["Metric", "Value"],
      columnWidths: [220, 80],
      rows: [
        ["Organizations", overview.organizationCount],
        ["Client orgs", overview.clientOrgCount],
        ["Agency orgs", overview.agencyOrgCount],
        ["Requisitions", overview.requisitionCount],
        ["Open requisitions", overview.openRequisitionCount],
        ["Submissions", overview.submissionCount],
        ["Placements", overview.placementCount],
      ],
    });
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pdf = buildPdf(title, sections);
  return pdfResponse("staffic-report.pdf", pdf);
}
