import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyNewAgencySignup, notifyAgencyApprovalDecision } from "@/lib/notifications";

export interface RegisterOrganizationInput {
  orgType: "CLIENT" | "AGENCY";
  orgName: string;
  userName: string;
  userEmail: string;
  userPassword: string;
}

/**
 * Self-serve signup: creates an Organization and its first (admin) User
 * together. CLIENT orgs are usable immediately. AGENCY orgs start
 * PENDING — see the ApprovalStatus comment in schema.prisma for why —
 * and can't browse the marketplace or submit candidates until a
 * PLATFORM_ADMIN approves them (enforced in the RBAC-adjacent checks in
 * submissions.ts / requisitions.ts... actually enforced in the dashboard
 * layout gate + the marketplace/candidate services — see DECISIONS.md).
 */
export async function registerOrganization(input: RegisterOrganizationInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.userEmail } });
  if (existingUser) {
    // Generic message to prevent email enumeration (V-14).
    throw new ForbiddenError("Unable to create account. Please try again or contact support.");
  }

  const passwordHash = await bcrypt.hash(input.userPassword, 12);

  const { organization, user } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.orgName,
        type: input.orgType,
        approvalStatus: input.orgType === "AGENCY" ? "PENDING" : "APPROVED",
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.userEmail,
        passwordHash,
        name: input.userName,
        role: input.orgType === "AGENCY" ? "AGENCY_ADMIN" : "CLIENT_ADMIN",
        organizationId: organization.id,
      },
    });

    return { organization, user };
  });

  const actor: SessionUser = { id: user.id, organizationId: organization.id, role: user.role };

  await logAuditEvent({
    actor,
    organizationId: organization.id,
    action: "ORGANIZATION_SIGNUP",
    entityType: "Organization",
    entityId: organization.id,
    metadata: { type: organization.type, approvalStatus: organization.approvalStatus },
  });

  if (organization.type === "AGENCY") {
    await notifyNewAgencySignup({ agencyOrgName: organization.name, agencyOrgId: organization.id });
  }

  return { organization, user };
}

/**
 * Defense-in-depth gate for the marketplace: called from listOpenRequisitions
 * and createSubmission so a PENDING agency can't browse or submit even if
 * they hit the routes directly. The dashboard layout also hides the nav
 * entirely for pending agencies — this is the server-side backstop.
 */
export async function requireApprovedOrg(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { approvalStatus: true },
  });
  if (!org || org.approvalStatus !== "APPROVED") {
    throw new ForbiddenError("Your organization is pending approval and cannot do this yet");
  }
}

/** Agency orgs awaiting a platform admin's review. */
export async function listPendingAgencies(actor: SessionUser) {
  requireRole(actor, ["PLATFORM_ADMIN"]);

  return prisma.organization.findMany({
    where: { type: "AGENCY", approvalStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { users: { select: { name: true, email: true } } },
  });
}

export async function decideAgencyApproval(actor: SessionUser, organizationId: string, approved: boolean) {
  requireRole(actor, ["PLATFORM_ADMIN"]);

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization || organization.type !== "AGENCY") {
    throw new ForbiddenError("Agency organization not found");
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { approvalStatus: approved ? "APPROVED" : "REJECTED" },
  });

  await logAuditEvent({
    actor,
    organizationId,
    action: "ORGANIZATION_APPROVAL_DECISION",
    entityType: "Organization",
    entityId: organizationId,
    metadata: { approved },
  });

  await notifyAgencyApprovalDecision({
    agencyOrgId: organizationId,
    agencyOrgName: organization.name,
    approved,
  });

  return updated;
}
