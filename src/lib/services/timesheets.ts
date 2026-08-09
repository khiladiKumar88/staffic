import { prisma } from "@/lib/prisma";
import { requireRole, requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyTimesheetSubmitted, notifyTimesheetReviewed } from "@/lib/notifications";

/**
 * Timesheets against agency-sourced Placements only — see the scope note
 * on Timesheet/Invoice in schema.prisma. Agency submits (they manage the
 * placed worker), client reviews (they supervised the actual work).
 */

export interface CreateTimesheetInput {
  placementId: string;
  weekStartDate: Date;
  hoursWorked: number;
  notes?: string;
}

function placementLabel(requisitionTitle: string, weekStartDate: Date): string {
  return `${requisitionTitle} (week of ${weekStartDate.toLocaleDateString()})`;
}

export async function createTimesheet(actor: SessionUser, input: CreateTimesheetInput) {
  requireRole(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"]);

  const placement = await prisma.placement.findUnique({
    where: { id: input.placementId },
    include: { submission: { include: { requisition: true } } },
  });
  if (!placement || placement.submission.agencyOrgId !== actor.organizationId) {
    throw new ForbiddenError("Placement not found in your organization");
  }

  const timesheet = await prisma.timesheet.create({
    data: {
      placementId: input.placementId,
      weekStartDate: input.weekStartDate,
      hoursWorked: input.hoursWorked,
      notes: input.notes,
      submittedById: actor.id,
      status: "SUBMITTED",
    },
  });

  const clientOrgId = placement.submission.requisition.organizationId;

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "TIMESHEET_CREATE",
    entityType: "Timesheet",
    entityId: timesheet.id,
    metadata: { placementId: input.placementId, hoursWorked: input.hoursWorked },
  });
  await logAuditEvent({
    actor,
    organizationId: clientOrgId,
    action: "TIMESHEET_CREATE",
    entityType: "Timesheet",
    entityId: timesheet.id,
    metadata: { placementId: input.placementId, hoursWorked: input.hoursWorked },
  });

  await notifyTimesheetSubmitted({
    clientOrgId,
    placementLabel: placementLabel(placement.submission.requisition.title, input.weekStartDate),
    hoursWorked: input.hoursWorked,
    weekStartDate: input.weekStartDate,
  });

  return timesheet;
}

/** Every timesheet touching the caller's org — as the submitting agency or the reviewing client. */
export async function listTimesheetsForOrg(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.timesheet.findMany({
    where: {
      placement: {
        submission: {
          OR: [
            { agencyOrgId: actor.organizationId },
            { requisition: { organizationId: actor.organizationId } },
          ],
        },
      },
    },
    orderBy: { weekStartDate: "desc" },
    include: {
      placement: {
        include: {
          submission: {
            include: {
              requisition: { select: { title: true, organizationId: true } },
              agencyOrg: { select: { name: true } },
              candidate: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function reviewTimesheet(actor: SessionUser, timesheetId: string, approved: boolean) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: { placement: { include: { submission: { include: { requisition: true } } } } },
  });
  if (!timesheet) throw new ForbiddenError("Timesheet not found");
  if (timesheet.status !== "SUBMITTED") {
    throw new ForbiddenError("Only submitted timesheets can be reviewed");
  }

  const clientOrgId = timesheet.placement.submission.requisition.organizationId;
  requireRole(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"]);
  requireOrgAccess(actor, clientOrgId);

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      reviewedById: actor.id,
      reviewedAt: new Date(),
    },
  });

  await logAuditEvent({
    actor,
    organizationId: clientOrgId,
    action: "TIMESHEET_STATUS_CHANGE",
    entityType: "Timesheet",
    entityId: timesheetId,
    metadata: { approved },
  });

  await notifyTimesheetReviewed({
    agencyOrgId: timesheet.placement.submission.agencyOrgId,
    placementLabel: placementLabel(timesheet.placement.submission.requisition.title, timesheet.weekStartDate),
    approved,
  });

  return updated;
}
