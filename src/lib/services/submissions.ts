import { prisma } from "@/lib/prisma";
import { requireRole, requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { requireApprovedOrg } from "@/lib/services/organizations";
import { notifyNewSubmission, notifySubmissionStatusChange } from "@/lib/notifications";
import type { SubmissionStatus } from "@prisma/client";

export interface CreateSubmissionInput {
  requisitionId: string;
  candidateId: string;
  proposedRate: number;
}

/**
 * An agency recruiter submits one of their own candidates against an
 * open, cross-org requisition. This is the one legitimate place a
 * non-platform-admin writes into another org's data — scoped by requiring
 * the requisition to be OPEN and the candidate to belong to the caller's org.
 */
export async function createSubmission(actor: SessionUser, input: CreateSubmissionInput) {
  requireRole(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"]);
  await requireApprovedOrg(actor.organizationId);

  const { requisitionId, candidateId, proposedRate } = input;

  const [requisition, candidate] = await Promise.all([
    prisma.requisition.findUnique({ where: { id: requisitionId }, include: { createdBy: true, organization: true } }),
    prisma.candidate.findUnique({ where: { id: candidateId } }),
  ]);

  if (!requisition || requisition.status !== "OPEN") {
    throw new ForbiddenError("Requisition is not open");
  }
  if (!candidate || candidate.organizationId !== actor.organizationId) {
    throw new ForbiddenError("Candidate not found in your organization");
  }

  const [submission, agencyOrg] = await Promise.all([
    prisma.submission.create({
      data: {
        requisitionId,
        candidateId,
        proposedRate,
        agencyOrgId: actor.organizationId,
        status: "SUBMITTED",
      },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { name: true } }),
  ]);

  // Log against both orgs involved — the agency that submitted, and the
  // client whose requisition just received a submission.
  await Promise.all([
    logAuditEvent({
      actor,
      organizationId: actor.organizationId,
      action: "SUBMISSION_CREATE",
      entityType: "Submission",
      entityId: submission.id,
      metadata: { requisitionId, status: submission.status },
    }),
    logAuditEvent({
      actor,
      organizationId: requisition.organizationId,
      action: "SUBMISSION_CREATE",
      entityType: "Submission",
      entityId: submission.id,
      metadata: { requisitionId, status: submission.status },
    }),
  ]);

  await notifyNewSubmission({
    requisitionId,
    requisitionTitle: requisition.title,
    requisitionCreatorEmail: requisition.createdBy.email,
    candidateName: candidate.name,
    agencyName: agencyOrg.name,
    proposedRate,
  });

  return submission;
}

/** Every submission received across all of a client org's requisitions — used by reporting/export. */
export async function listSubmissionsForClientOrg(actor: SessionUser) {
  requireRole(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"]);
  requireOrgAccess(actor, actor.organizationId);

  return prisma.submission.findMany({
    where: { requisition: { organizationId: actor.organizationId } },
    orderBy: { createdAt: "desc" },
    include: {
      candidate: true,
      requisition: { select: { title: true, specialty: true } },
      agencyOrg: { select: { name: true } },
      placement: true,
    },
  });
}

/** An agency's own submissions across every requisition — "my submissions" tracker. */
export async function listSubmissionsForAgency(actor: SessionUser) {
  requireRole(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"]);
  requireOrgAccess(actor, actor.organizationId);

  return prisma.submission.findMany({
    where: { agencyOrgId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      candidate: true,
      requisition: { include: { organization: { select: { name: true } } } },
      placement: true,
    },
  });
}

const NEXT_VALID_STATUSES: SubmissionStatus[] = [
  "UNDER_REVIEW",
  "INTERVIEW_REQUESTED",
  "APPROVED",
  "REJECTED",
];

/** Client reviews a submission on one of their own requisitions. */
export async function updateSubmissionStatus(
  actor: SessionUser,
  submissionId: string,
  status: SubmissionStatus,
) {
  if (!NEXT_VALID_STATUSES.includes(status)) {
    throw new ForbiddenError(`Cannot set submission status to ${status} directly`);
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { requisition: true, candidate: true },
  });
  if (!submission) throw new ForbiddenError("Submission not found");

  requireRole(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"]);
  requireOrgAccess(actor, submission.requisition.organizationId);

  if (status === "APPROVED") {
    const alreadyApproved = await prisma.submission.findFirst({
      where: { requisitionId: submission.requisitionId, status: "APPROVED", id: { not: submissionId } },
    });
    if (alreadyApproved) {
      throw new ForbiddenError(
        "Another submission on this requisition is already approved — reject or withdraw it first",
      );
    }
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status, reviewedById: actor.id, reviewedAt: new Date() },
  });

  await logAuditEvent({
    actor,
    organizationId: submission.requisition.organizationId,
    action: "SUBMISSION_STATUS_CHANGE",
    entityType: "Submission",
    entityId: submissionId,
    metadata: { from: submission.status, to: status },
  });

  // Mirror into the agency's audit trail too — it's their data changing state.
  await logAuditEvent({
    actor,
    organizationId: submission.agencyOrgId,
    action: "SUBMISSION_STATUS_CHANGE",
    entityType: "Submission",
    entityId: submissionId,
    metadata: { from: submission.status, to: status },
  });

  await notifySubmissionStatusChange({
    agencyOrgId: submission.agencyOrgId,
    requisitionTitle: submission.requisition.title,
    candidateName: submission.candidate.name,
    status,
  });

  return updated;
}
