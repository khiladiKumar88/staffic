import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyTeamInvite } from "@/lib/notifications";
import type { UserRole } from "@prisma/client";

/**
 * Team invites (closes a Phase 3 gap — see docs/DECISIONS.md). Previously
 * every signup created a brand-new Organization, so a second person at the
 * same hospital had no way to join the existing account. This lets an org
 * admin invite a teammate by email; accepting the invite creates a User in
 * the *same* org instead of a new one.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type InvitableOrgType = "CLIENT" | "AGENCY";

const ADMIN_ROLE_BY_ORG_TYPE: Record<InvitableOrgType, UserRole> = {
  CLIENT: "CLIENT_ADMIN",
  AGENCY: "AGENCY_ADMIN",
};

const INVITABLE_ROLES_BY_ORG_TYPE: Record<InvitableOrgType, UserRole[]> = {
  CLIENT: ["CLIENT_ADMIN", "CLIENT_MANAGER"],
  AGENCY: ["AGENCY_ADMIN", "AGENCY_RECRUITER"],
};

function isInvitableOrgType(type: string): type is InvitableOrgType {
  return type === "CLIENT" || type === "AGENCY";
}

function requireOrgAdmin(actor: SessionUser, orgType: string): void {
  if (actor.role === "PLATFORM_ADMIN") return;
  if (!isInvitableOrgType(orgType) || actor.role !== ADMIN_ROLE_BY_ORG_TYPE[orgType]) {
    throw new ForbiddenError("Only an org admin can manage invites");
  }
}

// ---------------------------------------------------------------------------
// Authenticated — sending/managing invites, viewing the team roster
// ---------------------------------------------------------------------------

export interface CreateInviteInput {
  email: string;
  role: UserRole;
}

export async function createInvite(actor: SessionUser, input: CreateInviteInput) {
  const org = await prisma.organization.findUnique({ where: { id: actor.organizationId } });
  if (!org) throw new ForbiddenError("Organization not found");
  requireOrgAccess(actor, org.id);
  requireOrgAdmin(actor, org.type);

  if (!isInvitableOrgType(org.type)) {
    throw new ForbiddenError("This organization type can't invite teammates");
  }
  if (!INVITABLE_ROLES_BY_ORG_TYPE[org.type].includes(input.role)) {
    throw new ForbiddenError("That role isn't valid for this organization");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new ForbiddenError("Someone with that email already has an account");
  }

  const existingPendingInvite = await prisma.inviteToken.findFirst({
    where: { organizationId: org.id, email: input.email, status: "PENDING" },
  });
  if (existingPendingInvite) {
    throw new ForbiddenError("There's already a pending invite for that email");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await prisma.inviteToken.create({
    data: {
      token,
      organizationId: org.id,
      email: input.email,
      role: input.role,
      invitedById: actor.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await logAuditEvent({
    actor,
    organizationId: org.id,
    action: "INVITE_CREATE",
    entityType: "InviteToken",
    entityId: invite.id,
    metadata: { role: input.role },
  });

  const inviter = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
  await notifyTeamInvite({
    toEmail: input.email,
    orgName: org.name,
    inviterName: inviter?.name ?? "A teammate",
    token,
  });

  return invite;
}

export async function listInvitesForOrg(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);
  return prisma.inviteToken.findMany({
    where: { organizationId: actor.organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTeamMembers(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);
  return prisma.user.findMany({
    where: { organizationId: actor.organizationId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function revokeInvite(actor: SessionUser, inviteId: string) {
  const invite = await prisma.inviteToken.findUnique({ where: { id: inviteId } });
  if (!invite) throw new ForbiddenError("Invite not found");
  requireOrgAccess(actor, invite.organizationId);

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: invite.organizationId } });
  requireOrgAdmin(actor, org.type);

  const updated = await prisma.inviteToken.update({ where: { id: inviteId }, data: { status: "REVOKED" } });

  await logAuditEvent({
    actor,
    organizationId: invite.organizationId,
    action: "INVITE_REVOKE",
    entityType: "InviteToken",
    entityId: inviteId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Public (unauthenticated) — accepting an invite. Mirrors registerOrganization
// in organizations.ts, but joins the invite's existing org instead of
// creating a new one.
// ---------------------------------------------------------------------------

export async function getInviteByToken(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return null;
  }
  return invite;
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export async function acceptInvite(input: AcceptInviteInput) {
  const invite = await getInviteByToken(input.token);
  if (!invite) {
    throw new ForbiddenError("This invite is invalid, expired, or has already been used");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new ForbiddenError("An account with that email already exists — sign in instead");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: invite.email,
        passwordHash,
        name: input.name,
        role: invite.role,
        organizationId: invite.organizationId,
      },
    });
    await tx.inviteToken.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return created;
  });

  await logAuditEvent({
    actor: { id: user.id, organizationId: user.organizationId, role: user.role },
    organizationId: user.organizationId,
    action: "INVITE_ACCEPT",
    entityType: "InviteToken",
    entityId: invite.id,
  });

  return user;
}
