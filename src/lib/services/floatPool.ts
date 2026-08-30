import { prisma } from "@/lib/prisma";
import { requireRoleAndOrg, requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import type { Specialty, FloatPoolAssignmentStatus } from "@prisma/client";

const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_MANAGER"] as const;

// ---------------------------------------------------------------------------
// Float pool workers — a client org's own internal contingent-worker bench.
// Deliberately no agency involvement anywhere in this file: this is the
// "cut out the middleman" feature (see PLAN.md Phase 3 / HWL's LIFT).
// ---------------------------------------------------------------------------

export interface CreateFloatPoolWorkerInput {
  name: string;
  email?: string;
  phone?: string;
  specialty: Specialty;
  credentials: string[];
}

export async function createFloatPoolWorker(actor: SessionUser, input: CreateFloatPoolWorkerInput) {
  requireRoleAndOrg(actor, [...CLIENT_ROLES], actor.organizationId);

  const worker = await prisma.floatPoolWorker.create({
    data: { ...input, organizationId: actor.organizationId },
  });

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "FLOAT_POOL_WORKER_CREATE",
    entityType: "FloatPoolWorker",
    entityId: worker.id,
  });

  return worker;
}

export async function listFloatPoolWorkers(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.floatPoolWorker.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    take: 200, // P-06: cap to prevent unbounded result sets
  });
}

// ---------------------------------------------------------------------------
// Float pool assignments — scheduling a worker onto a unit/shift for a
// date range. Not tied to a Requisition: internal float pool coverage is
// typically ad hoc unit coverage, not a formal posted role.
// ---------------------------------------------------------------------------

export interface CreateFloatPoolAssignmentInput {
  workerId: string;
  unit: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

export async function createFloatPoolAssignment(actor: SessionUser, input: CreateFloatPoolAssignmentInput) {
  requireRoleAndOrg(actor, [...CLIENT_ROLES], actor.organizationId);

  const worker = await prisma.floatPoolWorker.findUnique({ where: { id: input.workerId } });
  if (!worker || worker.organizationId !== actor.organizationId) {
    throw new ForbiddenError("Worker not found in your organization");
  }
  if (input.endDate < input.startDate) {
    throw new ForbiddenError("End date must be after start date");
  }

  const assignment = await prisma.floatPoolAssignment.create({
    data: {
      workerId: input.workerId,
      organizationId: actor.organizationId,
      unit: input.unit,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      createdById: actor.id,
      status: "SCHEDULED",
    },
  });

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "FLOAT_POOL_ASSIGNMENT_CREATE",
    entityType: "FloatPoolAssignment",
    entityId: assignment.id,
    metadata: { workerId: input.workerId, unit: input.unit },
  });

  return assignment;
}

export async function listFloatPoolAssignments(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.floatPoolAssignment.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startDate: "asc" },
    take: 200, // P-07: cap to prevent unbounded result sets
    include: { worker: { select: { id: true, name: true, specialty: true } } }, // P-19: only fields the UI needs
  });
}

export async function updateFloatPoolAssignmentStatus(
  actor: SessionUser,
  assignmentId: string,
  status: FloatPoolAssignmentStatus,
) {
  const assignment = await prisma.floatPoolAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new ForbiddenError("Assignment not found");

  requireRoleAndOrg(actor, [...CLIENT_ROLES], assignment.organizationId);

  const updated = await prisma.floatPoolAssignment.update({
    where: { id: assignmentId },
    data: { status },
  });

  await logAuditEvent({
    actor,
    organizationId: assignment.organizationId,
    action: "FLOAT_POOL_ASSIGNMENT_STATUS_CHANGE",
    entityType: "FloatPoolAssignment",
    entityId: assignmentId,
    metadata: { from: assignment.status, to: status },
  });

  return updated;
}
