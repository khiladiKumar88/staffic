import { prisma } from "@/lib/prisma";
import { requireRole, requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyInvoiceSent, notifyInvoicePaid } from "@/lib/notifications";

/**
 * Invoice = a record that money is owed, not a payment itself. Nothing in
 * here calls a payment processor. See the scope note on Timesheet/Invoice
 * in schema.prisma and docs/DECISIONS.md for why.
 */

/** Bundle every APPROVED, not-yet-invoiced timesheet for a placement into a new DRAFT invoice. */
export async function generateInvoice(actor: SessionUser, placementId: string) {
  requireRole(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"]);

  const placement = await prisma.placement.findUnique({
    where: { id: placementId },
    include: { submission: { include: { requisition: true } } },
  });
  if (!placement || placement.submission.agencyOrgId !== actor.organizationId) {
    throw new ForbiddenError("Placement not found in your organization");
  }

  const billableTimesheets = await prisma.timesheet.findMany({
    where: { placementId, status: "APPROVED", invoiceId: null },
    orderBy: { weekStartDate: "asc" },
  });
  if (billableTimesheets.length === 0) {
    throw new ForbiddenError("No approved, unbilled timesheets for this placement");
  }

  const totalHours = billableTimesheets.reduce((sum, t) => sum + Number(t.hoursWorked), 0);
  const totalAmount = totalHours * Number(placement.actualRate);
  const periodStart = billableTimesheets[0].weekStartDate;
  const periodEnd = billableTimesheets[billableTimesheets.length - 1].weekStartDate;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        placementId,
        clientOrgId: placement.submission.requisition.organizationId,
        agencyOrgId: actor.organizationId,
        periodStart,
        periodEnd,
        totalHours,
        totalAmount,
        status: "DRAFT",
      },
    });

    await tx.timesheet.updateMany({
      where: { id: { in: billableTimesheets.map((t) => t.id) } },
      data: { invoiceId: created.id },
    });

    return created;
  });

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "INVOICE_CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { placementId, totalAmount },
  });

  return invoice;
}

export async function sendInvoice(actor: SessionUser, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { placement: { include: { submission: { include: { requisition: true } } } } },
  });
  if (!invoice) throw new ForbiddenError("Invoice not found");
  if (invoice.status !== "DRAFT") throw new ForbiddenError("Only draft invoices can be sent");

  requireRole(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"]);
  requireOrgAccess(actor, invoice.agencyOrgId);

  const updated = await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SENT" } });

  await logAuditEvent({
    actor,
    organizationId: invoice.agencyOrgId,
    action: "INVOICE_STATUS_CHANGE",
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { from: "DRAFT", to: "SENT" },
  });

  await notifyInvoiceSent({
    clientOrgId: invoice.clientOrgId,
    placementLabel: invoice.placement.submission.requisition.title,
    totalAmount: Number(invoice.totalAmount),
  });

  return updated;
}

/** Client records that they've paid this invoice through their normal AP process. */
export async function markInvoicePaid(actor: SessionUser, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { placement: { include: { submission: { include: { requisition: true } } } } },
  });
  if (!invoice) throw new ForbiddenError("Invoice not found");
  if (invoice.status !== "SENT") throw new ForbiddenError("Only sent invoices can be marked paid");

  requireRole(actor, ["CLIENT_ADMIN", "CLIENT_MANAGER"]);
  requireOrgAccess(actor, invoice.clientOrgId);

  const updated = await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });

  await logAuditEvent({
    actor,
    organizationId: invoice.clientOrgId,
    action: "INVOICE_STATUS_CHANGE",
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { from: "SENT", to: "PAID" },
  });

  await notifyInvoicePaid({
    agencyOrgId: invoice.agencyOrgId,
    placementLabel: invoice.placement.submission.requisition.title,
    totalAmount: Number(invoice.totalAmount),
  });

  return updated;
}

/** Every invoice touching the caller's org — as the billing agency or the paying client. */
export async function listInvoicesForOrg(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.invoice.findMany({
    where: { OR: [{ agencyOrgId: actor.organizationId }, { clientOrgId: actor.organizationId }] },
    orderBy: { createdAt: "desc" },
    include: {
      placement: { include: { submission: { include: { requisition: { select: { title: true } } } } } },
      clientOrg: { select: { name: true } },
      agencyOrg: { select: { name: true } },
    },
  });
}
