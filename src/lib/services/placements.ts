import { prisma } from "@/lib/prisma";
import { requireRole, requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyPlacementCreated } from "@/lib/notifications";

export interface CreatePlacementInput {
  submissionId: string;
  startDate: Date;
  endDate?: Date;
  actualRate: number;
}

/** Client converts an APPROVED submission into a placement. */
export async function createPlacement(actor: SessionUser, input: CreatePlacementInput) {
  const submission = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    include: { requisition: true, candidate: true },
  });
  if (!submission) throw new ForbiddenError("Submission not found");
  if (submission.status !== "APPROVED") {
    throw new ForbiddenError("Only approved submissions can be placed");
  }

  requireRole(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"]);
  requireOrgAccess(actor, submission.requisition.organizationId);

  const placement = await prisma.$transaction(async (tx) => {
    const created = await tx.placement.create({
      data: {
        submissionId: input.submissionId,
        startDate: input.startDate,
        endDate: input.endDate,
        actualRate: input.actualRate,
        status: "UPCOMING",
      },
    });

    await tx.requisition.update({
      where: { id: submission.requisitionId },
      data: { status: "FILLED" },
    });

    return created;
  });

  // P-29: Run independent side-effects in parallel.
  await Promise.all([
    logAuditEvent({
      actor,
      organizationId: submission.requisition.organizationId,
      action: "PLACEMENT_CREATE",
      entityType: "Placement",
      entityId: placement.id,
      metadata: { submissionId: input.submissionId },
    }),
    notifyPlacementCreated({
      clientOrgId: submission.requisition.organizationId,
      agencyOrgId: submission.agencyOrgId,
      requisitionTitle: submission.requisition.title,
      candidateName: submission.candidate.name,
      startDate: input.startDate,
    }),
  ]);

  return placement;
}

/** An agency's own placements — used to populate the "which placement is this timesheet for" picker. */
export async function listPlacementsForAgency(actor: SessionUser) {
  requireRole(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"]);
  requireOrgAccess(actor, actor.organizationId);

  return prisma.placement.findMany({
    where: { submission: { agencyOrgId: actor.organizationId } },
    orderBy: { createdAt: "desc" },
    take: 200, // P-12: cap to prevent unbounded result sets
    include: { submission: { include: { requisition: { select: { title: true } }, candidate: { select: { name: true } } } } },
  });
}
