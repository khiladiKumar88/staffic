import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { isClientRole, isAgencyRole, isPlatformAdmin } from "@/lib/rbac";
import { DashboardNav } from "./nav";
import { UserMenu } from "./user-menu";
import { OrgTypeBadge } from "./org-type-badge";

const CLIENT_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/requisitions", label: "Requisitions" },
  { href: "/dashboard/float-pool", label: "Float Pool" },
  { href: "/dashboard/direct-hire", label: "Direct Hire" },
  { href: "/dashboard/timesheets", label: "Timesheets" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/team", label: "Team" },
];

const AGENCY_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/marketplace", label: "Marketplace" },
  { href: "/dashboard/candidates", label: "Candidates" },
  { href: "/dashboard/submissions", label: "My Submissions" },
  { href: "/dashboard/timesheets", label: "Timesheets" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/team", label: "Team" },
];

const PLATFORM_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/admin/agencies", label: "Pending Agencies" },
  { href: "/dashboard/reports", label: "Reports" },
];

// Friendly labels for the avatar's role line — UserRole enum values read
// fine in logs/audit trails but are too shouty for the header UI.
const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  CLIENT_ADMIN: "Admin",
  CLIENT_MANAGER: "Hiring Manager",
  AGENCY_ADMIN: "Admin",
  AGENCY_RECRUITER: "Recruiter",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  // Fresh-from-DB check rather than trusting the JWT — approval status can
  // change between token refreshes, and this is a cheap query on a layout
  // that already renders per-request. See docs/DECISIONS.md.
  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, type: true, approvalStatus: true },
  });

  if (organization && organization.type === "AGENCY" && organization.approvalStatus !== "APPROVED") {
    return (
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-white">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                S
              </div>
              <span className="text-[17px] font-bold tracking-tight text-ink">Staffic</span>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="flex w-full flex-1 items-center justify-center px-8 py-8">
          <div className="max-w-md rounded-xl border border-border bg-white p-8 text-center">
            {organization.approvalStatus === "PENDING" ? (
              <>
                <h1 className="text-lg font-semibold text-ink">Your account is under review</h1>
                <p className="mt-2 text-sm text-muted">
                  {organization.name} is waiting on Staffic to approve agency access. You&apos;ll get an
                  email as soon as a decision is made.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-ink">Application not approved</h1>
                <p className="mt-2 text-sm text-muted">
                  {organization.name}&apos;s application was not approved. Contact Staffic support if you
                  believe this is a mistake.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  const nav = isPlatformAdmin(user)
    ? PLATFORM_NAV
    : isClientRole(user)
      ? CLIENT_NAV
      : isAgencyRole(user)
        ? AGENCY_NAV
        : [];

  // Real "needs your attention" count for the notification bell — not
  // decorative. Client: submissions awaiting a decision. Agency: their own
  // submissions still pending review. Nothing for platform admin (no
  // per-org queue to page them about).
  let pendingCount = 0;
  if (isClientRole(user)) {
    pendingCount = await prisma.submission.count({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        requisition: { organizationId: user.organizationId },
      },
    });
  } else if (isAgencyRole(user)) {
    pendingCount = await prisma.submission.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, agencyOrgId: user.organizationId },
    });
  }

  const searchHref = isClientRole(user)
    ? "/dashboard/requisitions"
    : isAgencyRole(user)
      ? "/dashboard/marketplace"
      : "/dashboard";
  const bellHref = isClientRole(user)
    ? "/dashboard/requisitions"
    : isAgencyRole(user)
      ? "/dashboard/submissions"
      : "/dashboard";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-white">
        <div className="flex items-center gap-6 px-6 py-2.5">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              S
            </div>
            <span className="text-[17px] font-bold tracking-tight text-ink">Staffic</span>
          </Link>

          <DashboardNav items={nav} />

          <div className="ml-auto flex shrink-0 items-center gap-4">
            <Link
              href={searchHref}
              aria-label="Search"
              className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
            </Link>

            <Link
              href={bellHref}
              aria-label="Notifications"
              className="relative rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-status-red" />
              )}
            </Link>

            {!isPlatformAdmin(user) && <OrgTypeBadge type={isClientRole(user) ? "CLIENT" : "AGENCY"} />}

            <UserMenu
              name={user.name}
              role={ROLE_LABEL[user.role] ?? user.role}
              initials={initials(user.name)}
            />
          </div>
        </div>
      </header>
      <main className="w-full flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
