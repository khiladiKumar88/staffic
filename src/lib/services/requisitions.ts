import { prisma } from "@/lib/prisma";
import { requireRoleAndOrg, requireOrgAccess, isAgencyRole, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { requireApprovedOrg } from "@/lib/services/organizations";
import type { Specialty } from "@prisma/client";

export interface CreateRequisitionInput {
  title: string;
  specialty: Specialty;
  location: string;
  rateMin: number;
  rateMax: number;
  startDate?: Date;
  description?: string;
}

export async function createRequisition(actor: SessionUser, input: CreateRequisitionInput) {
  requireRoleAndOrg(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"], actor.organizationId);

  const requisition = await prisma.requisition.create({
    data: {
      ...input,
      organizationId: actor.organizationId,
      createdById: actor.id,
      status: "OPEN",
    },
  });

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "REQUISITION_CREATE",
    entityType: "Requisition",
    entityId: requisition.id,
    metadata: { specialty: requisition.specialty, status: requisition.status },
  });

  return requisition;
}

/** Requisitions belonging to the caller's own org (client-side "my requisitions" view). */
export async function listRequisitionsForOrg(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.requisition.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
}

/** Open requisitions across every client org — the agency-facing marketplace view. */
export async function listOpenRequisitions(actor: SessionUser) {
  if (isAgencyRole(actor)) {
    await requireApprovedOrg(actor.organizationId);
  }

  return prisma.requisition.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { id: true, name: true } },
      _count: { select: { submissions: true } },
    },
  });
}

/**
 * Full requisition detail including submissions. Only the owning client
 * org (or a platform admin) can see this — agencies get requisition
 * summaries from listOpenRequisitions() and their own submission status
 * from listSubmissionsForAgency(), not the client's full review queue.
 */
export async function getRequisitionDetail(actor: SessionUser, requisitionId: string) {
  const requisition = await prisma.requisition.findUnique({
    where: { id: requisitionId },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
        include: {
          candidate: true,
          agencyOrg: { select: { id: true, name: true } },
          placement: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!requisition) return null;

  requireOrgAccess(actor, requisition.organizationId);

  return requisition;
}

export async function updateRequisitionStatus(
  actor: SessionUser,
  requisitionId: string,
  status: "OPEN" | "ON_HOLD" | "FILLED" | "CANCELLED",
) {
  const requisition = await prisma.requisition.findUnique({ where: { id: requisitionId } });
  if (!requisition) throw new ForbiddenError("Requisition not found");

  requireRoleAndOrg(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"], requisition.organizationId);

  const updated = await prisma.requisition.update({
    where: { id: requisitionId },
    data: { status },
  });

  await logAuditEvent({
    actor,
    organizationId: requisition.organizationId,
    action: "REQUISITION_STATUS_CHANGE",
    entityType: "Requisition",
    entityId: requisitionId,
    metadata: { from: requisition.status, to: status },
  });

  return updated;
}
