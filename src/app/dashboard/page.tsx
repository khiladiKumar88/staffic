import Link from "next/link";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { listRequisitionsForOrg } from "@/lib/services/requisitions";
import { listCandidatesForOrg } from "@/lib/services/candidates";
import { listSubmissionsForAgency, listSubmissionsForClientOrg } from "@/lib/services/submissions";
import { getPlacementsByMonth } from "@/lib/services/reports";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/BarChart";

/* ------------------------------------------------------------------ */
/*  Section header bar component (HWL-style)                          */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  actionLabel,
  actionHref,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="section-header">
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
/*  Stat grid item                                                     */
/* ------------------------------------------------------------------ */

function StatGridItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="stat-grid__item">
      <span className="stat-grid__label">{label}</span>
      <span className={`stat-grid__value ${highlight ? "stat-grid__value--highlight" : ""}`}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function DashboardOverviewPage() {
  const session = await auth();
  const user = session!.user;
  const firstName = user.name.split(" ")[0];

  /* ---- Client dashboard ---- */
  if (isClientRole(user)) {
    const [requisitions, submissions, placementsByMonth] = await Promise.all([
      listRequisitionsForOrg(user),
      listSubmissionsForClientOrg(user),
      getPlacementsByMonth(user),
    ]);
    const open = requisitions.filter((r) => r.status === "OPEN").length;
    const onHold = requisitions.filter((r) => r.status === "ON_HOLD").length;
    const filled = requisitions.filter((r) => r.status === "FILLED").length;
    const toReview = submissions.filter(
      (s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW",
    ).length;
    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    const placements = submissions.filter((s) => s.placement).length;
    const recent = requisitions.slice(0, 5);

    return (
      <div className="flex flex-col gap-6">
        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">Dashboard</h1>
            <p className="mt-0.5 text-sm text-muted">Welcome back, {firstName}</p>
          </div>
          <Link href="/dashboard/requisitions#new-requisition" className={buttonClasses("primary")}>
            + New requisition
          </Link>
        </div>

        {/* Requisition summary section */}
        <div>
          <SectionHeader
            title="Requisition Summary"
            actionLabel="View all"
            actionHref="/dashboard/requisitions"
          />
          <div className="stat-grid">
            <StatGridItem label="Open" value={open} highlight={open > 0} />
            <StatGridItem label="On Hold" value={onHold} />
            <StatGridItem label="Filled" value={filled} />
            <StatGridItem label="Total" value={requisitions.length} />
          </div>
        </div>

        {/* Submissions review section */}
        <div>
          <SectionHeader
            title="Submissions Review"
            actionLabel="View all"
            actionHref="/dashboard/submissions"
          />
          <div className="stat-grid">
            <StatGridItem label="Awaiting Review" value={toReview} highlight={toReview > 0} />
            <StatGridItem label="Approved" value={approved} />
            <StatGridItem label="Placements" value={placements} />
            <StatGridItem label="Total" value={submissions.length} />
          </div>
        </div>

        {/* Recent requisitions table + chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-white lg:col-span-2 overflow-hidden">
            <SectionHeader title="Recent Requisitions" actionLabel="View all" actionHref="/dashboard/requisitions" />
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No requisitions yet — post one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Requisition</th>
                      <th>Specialty</th>
                      <th>Status</th>
                      <th>Submissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/dashboard/requisitions/${r.id}`} className="font-medium text-ink hover:text-primary">
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

          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Agency dashboard ---- */
  if (isAgencyRole(user)) {
    const [candidates, submissions, placementsByMonth] = await Promise.all([
      listCandidatesForOrg(user),
      listSubmissionsForAgency(user),
      getPlacementsByMonth(user),
    ]);
    const pending = submissions.filter(
      (s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW",
    ).length;
    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    const placements = submissions.filter((s) => s.placement).length;
    const recent = submissions.slice(0, 5);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">Dashboard</h1>
            <p className="mt-0.5 text-sm text-muted">Welcome back, {firstName}</p>
          </div>
          <Link href="/dashboard/marketplace" className={buttonClasses("primary")}>
            Browse open requisitions
          </Link>
        </div>

        {/* Staff Pool section */}
        <div>
          <SectionHeader title="Staff Pool" />
          <div className="stat-grid">
            <StatGridItem label="Active Candidates" value={candidates.length} highlight />
          </div>
        </div>

        {/* Submissions section */}
        <div>
          <SectionHeader
            title="Submission Status"
            actionLabel="View all"
            actionHref="/dashboard/submissions"
          />
          <div className="stat-grid">
            <StatGridItem label="Pending Review" value={pending} highlight={pending > 0} />
            <StatGridItem label="Approved" value={approved} />
            <StatGridItem label="Placements" value={placements} />
            <StatGridItem label="Total" value={submissions.length} />
          </div>
        </div>

        {/* Recent submissions table + chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-white lg:col-span-2 overflow-hidden">
            <SectionHeader title="Recent Submissions" actionLabel="View all" actionHref="/dashboard/submissions" />
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No submissions yet — browse the marketplace to get started.</p>
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
                    {recent.map((s) => (
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

          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Platform admin dashboard ---- */
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted">Welcome back, {user.name}</p>
      </div>
      <div>
        <SectionHeader title="Platform Overview" />
        <p className="mt-2 text-sm text-muted">
          See{" "}
          <Link href="/dashboard/reports" className="font-medium text-primary hover:underline">
            Reports
          </Link>{" "}
          for the platform-wide overview, or review{" "}
          <Link href="/dashboard/admin/agencies" className="font-medium text-primary hover:underline">
            Pending Agencies
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
