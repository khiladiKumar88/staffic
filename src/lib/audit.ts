import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/rbac";

/**
 * Central audit logging helper. Call this on every create/update/delete
 * (and on sensitive reads, e.g. downloading a candidate document) that
 * touches a Requisition, Candidate, Submission, or Placement.
 *
 * HIPAA-aware rule: `metadata` must only ever contain small, non-PHI
 * context (status transitions, IDs, counts) — never candidate names,
 * contact info, document contents, or free-text notes. If you're not
 * sure whether a field is PHI, leave it out.
 */

export type AuditAction =
  | "REQUISITION_CREATE"
  | "REQUISITION_UPDATE"
  | "REQUISITION_STATUS_CHANGE"
  | "REQUISITION_DELETE"
  | "CANDIDATE_CREATE"
  | "CANDIDATE_UPDATE"
  | "CANDIDATE_DOCUMENT_ACCESS"
  | "SUBMISSION_CREATE"
  | "SUBMISSION_STATUS_CHANGE"
  | "PLACEMENT_CREATE"
  | "PLACEMENT_UPDATE"
  | "ORGANIZATION_SIGNUP"
  | "ORGANIZATION_APPROVAL_DECISION"
  | "FLOAT_POOL_WORKER_CREATE"
  | "FLOAT_POOL_ASSIGNMENT_CREATE"
  | "FLOAT_POOL_ASSIGNMENT_STATUS_CHANGE"
  | "TIMESHEET_CREATE"
  | "TIMESHEET_STATUS_CHANGE"
  | "INVOICE_CREATE"
  | "INVOICE_STATUS_CHANGE"
  | "DIRECT_HIRE_JOB_CREATE"
  | "DIRECT_HIRE_JOB_STATUS_CHANGE"
  | "JOB_APPLICATION_CREATE"
  | "JOB_APPLICATION_STATUS_CHANGE"
  | "INVITE_CREATE"
  | "INVITE_REVOKE"
  | "INVITE_ACCEPT";

export type AuditEntityType =
  | "Requisition"
  | "Candidate"
  | "Submission"
  | "Placement"
  | "Organization"
  | "FloatPoolWorker"
  | "FloatPoolAssignment"
  | "Timesheet"
  | "Invoice"
  | "DirectHireJob"
  | "JobApplication"
  | "InviteToken";

interface LogAuditEventInput {
  actor: SessionUser;
  organizationId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  const { actor, organizationId, action, entityType, entityId, metadata } = input;

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      organizationId,
      action,
      entityType,
      entityId,
      metadata: metadata ?? undefined,
    },
  });
}
