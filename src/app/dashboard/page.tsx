import Link from "next/link";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { getPlacementsByMonth } from "@/lib/services/reports";
import { getDashboardCounts } from "@/lib/services/dashboard";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/BarChart";

/* ------------------------------------------------------------------ */
/*  Stat strip item                                                    */
/* ------------------------------------------------------------------ */

function StatItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="stat-strip__item">
      <span className="stat-strip__label">{label}</span>
      <div className="stat-strip__value-row">
        <span className="stat-strip__value">{value}</span>
      </div>
      {sub && <span className="stat-strip__sub">{sub}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header (compact, flat)                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  actionLabel,
  actionHref,
  standalone = false,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  standalone?: boolean;
}) {
  return (
    <div className={`section-header ${standalone ? "section-header--standalone" : ""}`}>
      <span className="section-header__title">{title}</span>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="section-header__action">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function DashboardOverviewPage() {
  const session = await auth();
  const user = session!.user;

  /* ---- Client dashboard ---- */
  if (isClientRole(user)) {
    const [data, placementsByMonth] = await Promise.all([
      getDashboardCounts(user),
      getPlacementsByMonth(user),
    ]);
    if (!data || data.type !== "client") throw new Error("Unexpected dashboard data");
    const { reqOpen, reqOnHold, reqFilled, reqTotal, subToReview, subApproved, subPlacements, subTotal, recentRequisitions } = data;

    return (
      <div className="flex flex-col gap-5">
        {/* Page heading */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-ink">Contingent labor overview</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {reqTotal} total requisitions &middot; {subTotal} submissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted border border-border rounded px-2.5 py-1.5">Last 30 days</span>
            <Link href="/dashboard/requisitions#new-requisition" className={buttonClasses("primary")}>
              New requisition
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="stat-strip">
          <StatItem label="Open reqs" value={reqOpen} sub={reqOnHold > 0 ? `${reqOnHold} on hold` : undefined} />
          <StatItem label="Awaiting review" value={subToReview} />
          <StatItem label="Approved" value={subApproved} />
          <StatItem label="Placements" value={subPlacements} />
          <StatItem label="Filled reqs" value={reqFilled} />
        </div>

        {/* Alert banner for pending items */}
        {subToReview > 0 && (
          <div className="alert-banner">
            <div className="alert-banner__text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{subToReview} submission{subToReview > 1 ? "s" : ""} awaiting your review.</span>
            </div>
            <Link href="/dashboard/submissions" className="alert-banner__action">Review now</Link>
          </div>
        )}

        {/* Recent requisitions table + chart */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-white lg:col-span-2 overflow-hidden">
            <SectionHeader title="Recent requisitions" actionLabel="View all" actionHref="/dashboard/requisitions" />
            {recentRequisitions.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No requisitions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Requisition</th>
                      <th>Specialty</th>
                      <th>Status</th>
                      <th>Subs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequisitions.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/dashboard/requisitions/${r.id}`} className="font-medium text-primary hover:underline">
                            {r.title}
                          </Link>
                        </td>
                        <td className="text-muted">{r.specialty.replaceAll("_", " ")}</td>
                        <td><Badge status={r.status} /></td>
                        <td>{r._count.submissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold text-muted uppercase tracking-wide">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Agency dashboard ---- */
  if (isAgencyRole(user)) {
    const [data, placementsByMonth] = await Promise.all([
      getDashboardCounts(user),
      getPlacementsByMonth(user),
    ]);
    if (!data || data.type !== "agency") throw new Error("Unexpected dashboard data");
    const { candidateCount, subPending, subApproved, subPlacements, subTotal, recentSubmissions } = data;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-ink">Agency overview</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {candidateCount} active candidates &middot; {subTotal} submissions
            </p>
          </div>
          <Link href="/dashboard/marketplace" className={buttonClasses("primary")}>
            Browse requisitions
          </Link>
        </div>

        {/* Stat strip */}
        <div className="stat-strip">
          <StatItem label="Active candidates" value={candidateCount} />
          <StatItem label="Pending review" value={subPending} />
          <StatItem label="Approved" value={subApproved} />
          <StatItem label="Placements" value={subPlacements} />
          <StatItem label="Total subs" value={subTotal} />
        </div>

        {subPending > 0 && (
          <div className="alert-banner">
            <div className="alert-banner__text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{subPending} submission{subPending > 1 ? "s" : ""} pending client review.</span>
            </div>
            <Link href="/dashboard/submissions" className="alert-banner__action">View status</Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-white lg:col-span-2 overflow-hidden">
            <SectionHeader title="Recent submissions" actionLabel="View all" actionHref="/dashboard/submissions" />
            {recentSubmissions.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Requisition</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map((s) => (
                      <tr key={s.id}>
                        <td className="font-medium text-ink">{s.candidate.name}</td>
                        <td className="text-muted">{s.requisition.title}</td>
                        <td><Badge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold text-muted uppercase tracking-wide">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Platform admin dashboard ---- */
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Platform overview</h1>
        <p className="mt-0.5 text-[13px] text-muted">System administration</p>
      </div>
      <div className="rounded-md border border-border bg-white p-5">
        <p className="text-sm text-muted">
          See{" "}
          <Link href="/dashboard/reports" className="font-medium text-primary hover:underline">
            Reports
          </Link>{" "}
          for platform-wide metrics, or review{" "}
          <Link href="/dashboard/admin/agencies" className="font-medium text-primary hover:underline">
            Pending Agencies
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
