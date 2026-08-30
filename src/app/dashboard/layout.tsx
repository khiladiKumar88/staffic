import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { isClientRole, isAgencyRole, isPlatformAdmin } from "@/lib/rbac";
import { DashboardShell } from "./dashboard-shell";

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

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, type: true, approvalStatus: true },
  });

  // Pending / rejected agency — minimal chrome, no sidebar
  if (organization && organization.type === "AGENCY" && organization.approvalStatus !== "APPROVED") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            S
          </div>
          {organization.approvalStatus === "PENDING" ? (
            <>
              <h1 className="text-lg font-semibold text-ink">Your account is under review</h1>
              <p className="mt-2 text-sm text-muted">
                {organization.name} is waiting on Staffic to approve agency access. You&apos;ll get
                an email as soon as a decision is made.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-ink">Application not approved</h1>
              <p className="mt-2 text-sm text-muted">
                {organization.name}&apos;s application was not approved. Contact Staffic support if
                you believe this is a mistake.
              </p>
            </>
          )}
          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
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

  const orgType: "CLIENT" | "AGENCY" | "PLATFORM" = isPlatformAdmin(user)
    ? "PLATFORM"
    : isClientRole(user)
      ? "CLIENT"
      : "AGENCY";

  return (
    <DashboardShell
      sidebarProps={{
        items: nav,
        orgName: organization?.name ?? "Staffic",
        orgType,
        userName: user.name,
        userRole: ROLE_LABEL[user.role] ?? user.role,
        userInitials: initials(user.name),
        pendingCount,
      }}
    >
      {children}
    </DashboardShell>
  );
}
