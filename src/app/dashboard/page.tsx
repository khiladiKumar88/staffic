import Link from "next/link";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { listRequisitionsForOrg } from "@/lib/services/requisitions";
import { listCandidatesForOrg } from "@/lib/services/candidates";
import { listSubmissionsForAgency, listSubmissionsForClientOrg } from "@/lib/services/submissions";
import { getPlacementsByMonth } from "@/lib/services/reports";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/BarChart";

export default async function DashboardOverviewPage() {
  const session = await auth();
  const user = session!.user;
  const firstName = user.name.split(" ")[0];

  if (isClientRole(user)) {
    const [requisitions, submissions, placementsByMonth] = await Promise.all([
      listRequisitionsForOrg(user),
      listSubmissionsForClientOrg(user),
      getPlacementsByMonth(user),
    ]);
    const open = requisitions.filter((r) => r.status === "OPEN").length;
    const toReview = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;
    const placements = submissions.filter((s) => s.placement).length;
    const recent = requisitions.slice(0, 5);

    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Good morning, {firstName}</h1>
            <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening across your organization today.</p>
          </div>
          <Link href="/dashboard/requisitions#new-requisition" className={buttonClasses("primary")}>
            + New requisition
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open requisitions" value={open} />
          <StatCard
            label="Submissions to review"
            value={toReview}
            delta={toReview > 0 ? `${toReview} awaiting a decision` : undefined}
            deltaTone={toReview > 0 ? "caution" : "neutral"}
          />
          <StatCard label="Placements" value={placements} deltaTone="good" />
          <StatCard label="Total requisitions" value={requisitions.length} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-0 lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Recent requisitions</h2>
              <Link href="/dashboard/requisitions" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">No requisitions yet — post one to get started.</p>
            ) : (
              <div className="overflow-x-auto border-t border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Requisition
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Specialty
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Status
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Submissions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recent.map((r) => (
                      <tr key={r.id} className="hover:bg-hover">
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/requisitions/${r.id}`} className="font-medium text-ink hover:text-primary">
                            {r.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-muted">{r.specialty.replaceAll("_", " ")}</td>
                        <td className="px-5 py-3">
                          <Badge status={r.status} />
                        </td>
                        <td className="px-5 py-3 text-ink">{r._count.submissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </Card>
        </div>
      </div>
    );
  }

  if (isAgencyRole(user)) {
    const [candidates, submissions, placementsByMonth] = await Promise.all([
      listCandidatesForOrg(user),
      listSubmissionsForAgency(user),
      getPlacementsByMonth(user),
    ]);
    const pending = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;
    const placements = submissions.filter((s) => s.placement).length;
    const recent = submissions.slice(0, 5);

    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Good morning, {firstName}</h1>
            <p className="mt-1 text-sm text-muted">Here&apos;s how your submissions are doing today.</p>
          </div>
          <Link href="/dashboard/marketplace" className={buttonClasses("primary")}>
            Browse open requisitions
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Candidates" value={candidates.length} />
          <StatCard
            label="Submissions pending review"
            value={pending}
            deltaTone={pending > 0 ? "caution" : "neutral"}
          />
          <StatCard label="Placements" value={placements} deltaTone="good" />
          <StatCard label="Total submissions" value={submissions.length} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-0 lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Recent submissions</h2>
              <Link href="/dashboard/submissions" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">No submissions yet — browse the marketplace to get started.</p>
            ) : (
              <div className="overflow-x-auto border-t border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Candidate
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Requisition
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recent.map((s) => (
                      <tr key={s.id} className="hover:bg-hover">
                        <td className="px-5 py-3 font-medium text-ink">{s.candidate.name}</td>
                        <td className="px-5 py-3 text-muted">{s.requisition.title}</td>
                        <td className="px-5 py-3">
                          <Badge status={s.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Welcome, {user.name}</h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;re signed in as a platform admin. Client/agency dashboards show org-specific data — see{" "}
        <Link href="/dashboard/reports" className="font-medium text-primary hover:underline">
          Reports
        </Link>{" "}
        for the platform-wide overview.
      </p>
    </div>
  );
}
