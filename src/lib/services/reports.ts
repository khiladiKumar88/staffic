import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleAndOrg, type SessionUser } from "@/lib/rbac";
import type { Specialty } from "@prisma/client";

/**
 * Reporting/BI layer (Phase 2). Everything here is read-only aggregation
 * on top of the Phase 0/1 data model — no new tables. Aggregation is done
 * in application code rather than DB-level groupBy because several of
 * these reports group by a *related* model's field (Submission grouped by
 * Requisition.specialty), which Prisma's groupBy can't do across a
 * relation. Fine at demo/pilot scale; revisit with raw SQL or a
 * denormalized reporting table if this becomes a hot path at real scale
 * (see docs/PLAN.md Phase 5 — Scale).
 */

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Client-side reports
// ---------------------------------------------------------------------------

export interface SpecialtySummaryRow {
  specialty: Specialty;
  requisitionCount: number;
  filledCount: number;
  openCount: number;
  avgProposedRate: number | null;
  avgActualRate: number | null;
  avgTimeToFillDays: number | null;
  /** Sum of hoursWorked x actualRate across APPROVED timesheets — real spend, not a rate proxy. */
  actualSpend: number;
  actualHoursBilled: number;
}

/**
 * Real per-specialty spend from approved timesheets, keyed by the
 * requisition's specialty. Was a genuine gap noted in docs/DECISIONS.md:
 * Timesheet didn't exist yet when this report was first written, so
 * "spend" was only ever a rate proxy (avgActualRate). Kept as a separate
 * query rather than folded into the main requisitions fetch below, since
 * it walks a different relation path (Timesheet -> Placement -> Submission
 * -> Requisition) than the requisition-first query does.
 */
async function getActualSpendBySpecialty(
  organizationId: string,
): Promise<Map<Specialty, { spend: number; hours: number }>> {
  const approvedTimesheets = await prisma.timesheet.findMany({
    where: {
      status: "APPROVED",
      placement: { submission: { requisition: { organizationId } } },
    },
    select: {
      hoursWorked: true,
      placement: {
        select: {
          actualRate: true,
          submission: { select: { requisition: { select: { specialty: true } } } },
        },
      },
    },
  });

  const bySpecialty = new Map<Specialty, { spend: number; hours: number }>();
  for (const t of approvedTimesheets) {
    const specialty = t.placement.submission.requisition.specialty;
    const hours = Number(t.hoursWorked);
    const spend = hours * Number(t.placement.actualRate);
    const entry = bySpecialty.get(specialty) ?? { spend: 0, hours: 0 };
    entry.spend += spend;
    entry.hours += hours;
    bySpecialty.set(specialty, entry);
  }
  return bySpecialty;
}

/** Per-specialty rollup of the client's own requisitions, including real spend from approved timesheets. */
export async function getClientSpecialtySummary(actor: SessionUser): Promise<SpecialtySummaryRow[]> {
  requireRoleAndOrg(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"], actor.organizationId);

  const [requisitions, actualSpendBySpecialty] = await Promise.all([
    prisma.requisition.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        submissions: { include: { placement: true } },
      },
    }),
    getActualSpendBySpecialty(actor.organizationId),
  ]);

  const bySpecialty = new Map<Specialty, typeof requisitions>();
  for (const req of requisitions) {
    const list = bySpecialty.get(req.specialty) ?? [];
    list.push(req);
    bySpecialty.set(req.specialty, list);
  }

  const rows: SpecialtySummaryRow[] = [];
  for (const [specialty, reqs] of bySpecialty) {
    const proposedRates = reqs.flatMap((r) => r.submissions.map((s) => Number(s.proposedRate)));
    const filled = reqs.filter((r) => r.status === "FILLED");
    const actualRates = filled.flatMap((r) =>
      r.submissions.filter((s) => s.placement).map((s) => Number(s.placement!.actualRate)),
    );
    const timeToFillDays = filled.flatMap((r) =>
      r.submissions
        .filter((s) => s.placement)
        .map((s) => daysBetween(r.createdAt, s.placement!.createdAt)),
    );
    const spendEntry = actualSpendBySpecialty.get(specialty);

    rows.push({
      specialty,
      requisitionCount: reqs.length,
      filledCount: filled.length,
      openCount: reqs.filter((r) => r.status === "OPEN").length,
      avgProposedRate: avg(proposedRates),
      avgActualRate: avg(actualRates),
      avgTimeToFillDays: avg(timeToFillDays),
      actualSpend: spendEntry?.spend ?? 0,
      actualHoursBilled: spendEntry?.hours ?? 0,
    });
  }

  return rows.sort((a, b) => b.requisitionCount - a.requisitionCount);
}

export interface MonthlyPlacementRow {
  /** Short month label, e.g. "Feb". */
  label: string;
  count: number;
}

/**
 * Real placement counts for the last 6 calendar months (current month
 * included), bucketed by Placement.createdAt. Same shape works for both
 * client and agency roles — only the `where` scoping differs — so it's one
 * function with a role branch rather than two near-duplicate queries.
 */
export async function getPlacementsByMonth(actor: SessionUser): Promise<MonthlyPlacementRow[]> {
  requireRole(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER", "AGENCY_ADMIN", "AGENCY_RECRUITER"]);

  const isAgency = actor.role === "AGENCY_ADMIN" || actor.role === "AGENCY_RECRUITER";

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const placements = await prisma.placement.findMany({
    where: {
      createdAt: { gte: start },
      submission: isAgency
        ? { agencyOrgId: actor.organizationId }
        : { requisition: { organizationId: actor.organizationId } },
    },
    select: { createdAt: true },
  });

  const buckets: MonthlyPlacementRow[] = [];
  const counts = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    counts.set(key, 0);
    buckets.push({ label: d.toLocaleDateString("en-US", { month: "short" }), count: 0 });
  }

  for (const p of placements) {
    const key = `${p.createdAt.getFullYear()}-${p.createdAt.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let idx = 0;
  for (const key of counts.keys()) {
    buckets[idx].count = counts.get(key) ?? 0;
    idx++;
  }

  return buckets;
}

export interface AgencyScorecardRow {
  agencyOrgId: string;
  agencyName: string;
  totalSubmissions: number;
  approved: number;
  rejected: number;
  approvalRate: number | null;
  avgProposedRate: number | null;
}

/** How each agency partner is performing against the client's own requisitions. */
export async function getAgencyScorecards(actor: SessionUser): Promise<AgencyScorecardRow[]> {
  requireRoleAndOrg(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"], actor.organizationId);

  const submissions = await prisma.submission.findMany({
    where: { requisition: { organizationId: actor.organizationId } },
    include: { agencyOrg: { select: { id: true, name: true } } },
  });

  const byAgency = new Map<string, { name: string; submissions: typeof submissions }>();
  for (const s of submissions) {
    const entry = byAgency.get(s.agencyOrgId) ?? { name: s.agencyOrg.name, submissions: [] };
    entry.submissions.push(s);
    byAgency.set(s.agencyOrgId, entry);
  }

  const rows: AgencyScorecardRow[] = [];
  for (const [agencyOrgId, { name, submissions: subs }] of byAgency) {
    const approved = subs.filter((s) => s.status === "APPROVED").length;
    const rejected = subs.filter((s) => s.status === "REJECTED").length;
    const decided = approved + rejected;

    rows.push({
      agencyOrgId,
      agencyName: name,
      totalSubmissions: subs.length,
      approved,
      rejected,
      approvalRate: decided > 0 ? approved / decided : null,
      avgProposedRate: avg(subs.map((s) => Number(s.proposedRate))),
    });
  }

  return rows.sort((a, b) => b.totalSubmissions - a.totalSubmissions);
}

// ---------------------------------------------------------------------------
// Agency-side reports
// ---------------------------------------------------------------------------

export interface AgencyFunnelRow {
  status: string;
  count: number;
}

/** The agency's own submission funnel across every requisition they've submitted to. */
export async function getAgencyFunnel(actor: SessionUser): Promise<AgencyFunnelRow[]> {
  requireRoleAndOrg(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"], actor.organizationId);

  const submissions = await prisma.submission.findMany({
    where: { agencyOrgId: actor.organizationId },
    select: { status: true },
  });

  const counts = new Map<string, number>();
  for (const s of submissions) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);

  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

// ---------------------------------------------------------------------------
// Platform-wide market intelligence — available to any authenticated user.
// Aggregated only; never exposes which specific org submitted what.
// ---------------------------------------------------------------------------

export interface MarketBenchmarkRow {
  specialty: Specialty;
  submissionCount: number;
  minProposedRate: number | null;
  avgProposedRate: number | null;
  maxProposedRate: number | null;
  avgActualPlacementRate: number | null;
}

export async function getMarketRateBenchmark(): Promise<MarketBenchmarkRow[]> {
  const submissions = await prisma.submission.findMany({
    include: {
      requisition: { select: { specialty: true } },
      placement: true,
    },
  });

  const bySpecialty = new Map<Specialty, typeof submissions>();
  for (const s of submissions) {
    const list = bySpecialty.get(s.requisition.specialty) ?? [];
    list.push(s);
    bySpecialty.set(s.requisition.specialty, list);
  }

  const rows: MarketBenchmarkRow[] = [];
  for (const [specialty, subs] of bySpecialty) {
    const rates = subs.map((s) => Number(s.proposedRate));
    const actualRates = subs.filter((s) => s.placement).map((s) => Number(s.placement!.actualRate));

    rows.push({
      specialty,
      submissionCount: subs.length,
      minProposedRate: rates.length ? Math.min(...rates) : null,
      avgProposedRate: avg(rates),
      maxProposedRate: rates.length ? Math.max(...rates) : null,
      avgActualPlacementRate: avg(actualRates),
    });
  }

  return rows.sort((a, b) => b.submissionCount - a.submissionCount);
}

// ---------------------------------------------------------------------------
// Platform admin overview
// ---------------------------------------------------------------------------

export interface PlatformOverview {
  organizationCount: number;
  clientOrgCount: number;
  agencyOrgCount: number;
  requisitionCount: number;
  openRequisitionCount: number;
  submissionCount: number;
  placementCount: number;
}

export async function getPlatformOverview(actor: SessionUser): Promise<PlatformOverview> {
  requireRole(actor, ["PLATFORM_ADMIN"]);

  const [organizationCount, clientOrgCount, agencyOrgCount, requisitionCount, openRequisitionCount, submissionCount, placementCount] =
    await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { type: "CLIENT" } }),
      prisma.organization.count({ where: { type: "AGENCY" } }),
      prisma.requisition.count(),
      prisma.requisition.count({ where: { status: "OPEN" } }),
      prisma.submission.count(),
      prisma.placement.count(),
    ]);

  return {
    organizationCount,
    clientOrgCount,
    agencyOrgCount,
    requisitionCount,
    openRequisitionCount,
    submissionCount,
    placementCount,
  };
}
