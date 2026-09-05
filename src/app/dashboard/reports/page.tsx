import type { ReactNode } from "react";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole, isPlatformAdmin } from "@/lib/rbac";
import {
  getClientSpecialtySummary,
  getAgencyScorecards,
  getAgencyFunnel,
  getMarketRateBenchmark,
  getPlatformOverview,
  getPlacementsByMonth,
} from "@/lib/services/reports";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/BarChart";

function fmtRate(n: number | null): string {
  return n === null ? "—" : `$${n.toFixed(2)}`;
}
function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(n: number | null): string {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}
function fmtDays(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(1)} days`;
}
function label(specialty: string): string {
  return specialty.replaceAll("_", " ");
}
function avg(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 mb-3 text-sm text-muted">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No data yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-white">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-hover">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportLink({ href, label: text }: { href: string; label: string }) {
  return (
    <a href={href} className={buttonClasses("secondary")}>
      {text}
    </a>
  );
}

function ProgressBar({ label: rowLabel, value }: { label: string; value: number | null }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink">{rowLabel}</span>
        <span className="font-medium text-ink">{value === null ? "—" : `${pct}%`}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-hover">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  const session = await auth();
  const user = session!.user;

  if (isClientRole(user)) {
    const [specialtySummary, scorecards, marketBenchmark, placementsByMonth] = await Promise.all([
      getClientSpecialtySummary(user),
      getAgencyScorecards(user),
      getMarketRateBenchmark(),
      getPlacementsByMonth(user),
    ]);

    const totalFilled = specialtySummary.reduce((sum, r) => sum + r.filledCount, 0);
    const totalReqs = specialtySummary.reduce((sum, r) => sum + r.requisitionCount, 0);
    const totalSpend = specialtySummary.reduce((sum, r) => sum + r.actualSpend, 0);
    const avgTimeToFill = avg(
      specialtySummary.map((r) => r.avgTimeToFillDays).filter((v): v is number => v !== null),
    );

    return (
      <div className="flex flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Reports</h1>
            <p className="mt-1 text-sm text-muted">Real numbers from your requisitions, submissions, and timesheets.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href="/api/reports/export/requisitions" label="Export requisitions (CSV)" />
            <ExportLink href="/api/reports/export/submissions" label="Export submissions (CSV)" />
            <ExportLink href="/api/reports/export/pdf" label="Export report (PDF)" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Avg. time to fill" value={fmtDays(avgTimeToFill)} />
          <StatCard label="Fill rate" value={fmtPct(totalReqs > 0 ? totalFilled / totalReqs : null)} />
          <StatCard label="Total placements" value={totalFilled} />
          <StatCard label="Actual spend (billed)" value={fmtMoney(totalSpend)} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Fill rate by specialty</h2>
            {specialtySummary.length === 0 ? (
              <p className="text-sm text-muted">No requisitions yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {specialtySummary.map((r) => (
                  <ProgressBar
                    key={r.specialty}
                    label={label(r.specialty)}
                    value={r.requisitionCount > 0 ? r.filledCount / r.requisitionCount : null}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="mb-1 text-base font-semibold text-ink">Requisitions by specialty</h2>
            <p className="mb-4 text-sm text-muted">
              &quot;Actual spend&quot; is hours worked × actual rate from approved timesheets, not a rate proxy.
            </p>
            <Table
              columns={["Specialty", "Open", "Filled", "Hrs billed", "Spend"]}
              rows={specialtySummary.map((r) => [
                label(r.specialty),
                r.openCount,
                r.filledCount,
                r.actualHoursBilled.toFixed(1),
                fmtMoney(r.actualSpend),
              ])}
            />
          </Card>
        </div>

        <Section title="Agency scorecards">
          <Table
            columns={["Agency", "Submissions", "Approved", "Rejected", "Approval rate", "Avg proposed rate"]}
            rows={scorecards.map((r) => [
              r.agencyName,
              r.totalSubmissions,
              r.approved,
              r.rejected,
              fmtPct(r.approvalRate),
              fmtRate(r.avgProposedRate),
            ])}
          />
        </Section>

        <Section
          title="Market rate benchmark (platform-wide)"
          subtitle="Aggregated across every agency and hospital on Staffic — never shows which org submitted what."
        >
          <Table
            columns={["Specialty", "Submissions", "Min", "Avg", "Max", "Avg placed rate"]}
            rows={marketBenchmark.map((r) => [
              label(r.specialty),
              r.submissionCount,
              fmtRate(r.minProposedRate),
              fmtRate(r.avgProposedRate),
              fmtRate(r.maxProposedRate),
              fmtRate(r.avgActualPlacementRate),
            ])}
          />
        </Section>
      </div>
    );
  }

  if (isAgencyRole(user)) {
    const [funnel, marketBenchmark, placementsByMonth] = await Promise.all([
      getAgencyFunnel(user),
      getMarketRateBenchmark(),
      getPlacementsByMonth(user),
    ]);
    const totalSubmissions = funnel.reduce((sum, r) => sum + r.count, 0);
    const approved = funnel.find((r) => r.status === "APPROVED")?.count ?? 0;

    return (
      <div className="flex flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Reports</h1>
            <p className="mt-1 text-sm text-muted">Your submission funnel and how your rates compare.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href="/api/reports/export/submissions" label="Export submissions (CSV)" />
            <ExportLink href="/api/reports/export/pdf" label="Export report (PDF)" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total submissions" value={totalSubmissions} />
          <StatCard label="Approved" value={approved} deltaTone="good" />
          <StatCard
            label="Approval rate"
            value={fmtPct(totalSubmissions > 0 ? approved / totalSubmissions : null)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Placements, last 6 months</h2>
            <BarChart data={placementsByMonth.map((r) => ({ label: r.label, count: r.count }))} />
          </Card>
          <Section title="Your submission funnel">
            <Table columns={["Status", "Count"]} rows={funnel.map((r) => [label(r.status), r.count])} />
          </Section>
        </div>

        <Section
          title="Market rate benchmark (platform-wide)"
          subtitle="See how your proposed rates compare to the rest of the market before you submit."
        >
          <Table
            columns={["Specialty", "Submissions", "Min", "Avg", "Max", "Avg placed rate"]}
            rows={marketBenchmark.map((r) => [
              label(r.specialty),
              r.submissionCount,
              fmtRate(r.minProposedRate),
              fmtRate(r.avgProposedRate),
              fmtRate(r.maxProposedRate),
              fmtRate(r.avgActualPlacementRate),
            ])}
          />
        </Section>
      </div>
    );
  }

  if (isPlatformAdmin(user)) {
    const overview = await getPlatformOverview(user);
    const cards: [string, number][] = [
      ["Organizations", overview.organizationCount],
      ["Client orgs", overview.clientOrgCount],
      ["Agency orgs", overview.agencyOrgCount],
      ["Requisitions", overview.requisitionCount],
      ["Open requisitions", overview.openRequisitionCount],
      ["Submissions", overview.submissionCount],
      ["Placements", overview.placementCount],
    ];

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-ink">Platform overview</h1>
          <ExportLink href="/api/reports/export/pdf" label="Export report (PDF)" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map(([labelText, value]) => (
            <StatCard key={labelText} label={labelText} value={value} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
