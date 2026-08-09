import { prisma } from "@/lib/prisma";
import { sendEmailSafely } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function wrapper(bodyHtml: string): string {
  return `<div style="font-family: sans-serif; font-size: 14px; color: #18181b; line-height: 1.5;">${bodyHtml}<p style="margin-top: 24px; color: #71717a; font-size: 12px;">Staffic — healthcare workforce management</p></div>`;
}

async function emailsForOrg(organizationId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

async function emailsForPlatformAdmins(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: "PLATFORM_ADMIN" },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

/** A client's requisition just received a new candidate submission. */
export async function notifyNewSubmission(params: {
  requisitionId: string;
  requisitionTitle: string;
  requisitionCreatorEmail: string;
  candidateName: string;
  agencyName: string;
  proposedRate: number;
}): Promise<void> {
  await sendEmailSafely({
    to: params.requisitionCreatorEmail,
    subject: `New submission for "${params.requisitionTitle}"`,
    html: wrapper(
      `<p><strong>${params.agencyName}</strong> submitted <strong>${params.candidateName}</strong> for your requisition "${params.requisitionTitle}" at $${params.proposedRate}/hr.</p>` +
        `<p><a href="${APP_URL}/dashboard/requisitions/${params.requisitionId}">Review this submission</a></p>`,
    ),
  });
}

/** A submission the agency sent in just changed status (approved/rejected/etc). */
export async function notifySubmissionStatusChange(params: {
  agencyOrgId: string;
  requisitionTitle: string;
  candidateName: string;
  status: string;
}): Promise<void> {
  const recipients = await emailsForOrg(params.agencyOrgId);
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `${params.candidateName}'s submission was ${params.status.replace("_", " ").toLowerCase()}`,
        html: wrapper(
          `<p>Your submission of <strong>${params.candidateName}</strong> for "${params.requisitionTitle}" is now <strong>${params.status.replace("_", " ")}</strong>.</p>` +
            `<p><a href="${APP_URL}/dashboard/submissions">View your submissions</a></p>`,
        ),
      }),
    ),
  );
}

/** An approved submission was converted into a confirmed placement. */
export async function notifyPlacementCreated(params: {
  clientOrgId: string;
  agencyOrgId: string;
  requisitionTitle: string;
  candidateName: string;
  startDate: Date;
}): Promise<void> {
  const [clientEmails, agencyEmails] = await Promise.all([
    emailsForOrg(params.clientOrgId),
    emailsForOrg(params.agencyOrgId),
  ]);

  const html = wrapper(
    `<p><strong>${params.candidateName}</strong> is confirmed for "${params.requisitionTitle}", starting ${params.startDate.toLocaleDateString()}.</p>`,
  );

  await Promise.all(
    [...clientEmails, ...agencyEmails].map((to) =>
      sendEmailSafely({ to, subject: `Placement confirmed: ${params.requisitionTitle}`, html }),
    ),
  );
}

/** A new agency org just self-registered and needs platform admin review. */
export async function notifyNewAgencySignup(params: { agencyOrgName: string; agencyOrgId: string }): Promise<void> {
  const recipients = await emailsForPlatformAdmins();
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `New agency awaiting approval: ${params.agencyOrgName}`,
        html: wrapper(
          `<p><strong>${params.agencyOrgName}</strong> just signed up and is pending approval before they can access the marketplace.</p>` +
            `<p><a href="${APP_URL}/dashboard/admin/agencies">Review pending agencies</a></p>`,
        ),
      }),
    ),
  );
}

/** A timesheet was submitted and needs the client's review. */
export async function notifyTimesheetSubmitted(params: {
  clientOrgId: string;
  placementLabel: string;
  hoursWorked: number;
  weekStartDate: Date;
}): Promise<void> {
  const recipients = await emailsForOrg(params.clientOrgId);
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `Timesheet submitted for ${params.placementLabel}`,
        html: wrapper(
          `<p>${params.hoursWorked} hours submitted for the week of ${params.weekStartDate.toLocaleDateString()} (${params.placementLabel}).</p>` +
            `<p><a href="${APP_URL}/dashboard/timesheets">Review timesheets</a></p>`,
        ),
      }),
    ),
  );
}

/** A timesheet was approved or rejected. */
export async function notifyTimesheetReviewed(params: {
  agencyOrgId: string;
  placementLabel: string;
  approved: boolean;
}): Promise<void> {
  const recipients = await emailsForOrg(params.agencyOrgId);
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `Timesheet ${params.approved ? "approved" : "rejected"} — ${params.placementLabel}`,
        html: wrapper(`<p>Your timesheet for ${params.placementLabel} was ${params.approved ? "approved" : "rejected"}.</p>`),
      }),
    ),
  );
}

/** An invoice was sent to the client for payment. */
export async function notifyInvoiceSent(params: {
  clientOrgId: string;
  placementLabel: string;
  totalAmount: number;
}): Promise<void> {
  const recipients = await emailsForOrg(params.clientOrgId);
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `New invoice: ${params.placementLabel} — $${params.totalAmount.toFixed(2)}`,
        html: wrapper(
          `<p>An invoice for $${params.totalAmount.toFixed(2)} is ready for ${params.placementLabel}.</p>` +
            `<p><a href="${APP_URL}/dashboard/invoices">View invoices</a></p>`,
        ),
      }),
    ),
  );
}

/** The client marked an invoice paid. */
export async function notifyInvoicePaid(params: {
  agencyOrgId: string;
  placementLabel: string;
  totalAmount: number;
}): Promise<void> {
  const recipients = await emailsForOrg(params.agencyOrgId);
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `Invoice paid: ${params.placementLabel}`,
        html: wrapper(`<p>Payment of $${params.totalAmount.toFixed(2)} for ${params.placementLabel} has been marked paid.</p>`),
      }),
    ),
  );
}

/** A new application came in on a direct-hire job posting. */
export async function notifyNewJobApplication(params: {
  clientOrgId: string;
  jobTitle: string;
  applicantName: string;
}): Promise<void> {
  const recipients = await emailsForOrg(params.clientOrgId);
  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: `New application: ${params.jobTitle}`,
        html: wrapper(
          `<p><strong>${params.applicantName}</strong> applied to "${params.jobTitle}".</p>` +
            `<p><a href="${APP_URL}/dashboard/direct-hire">Review applications</a></p>`,
        ),
      }),
    ),
  );
}

/** An org admin invited a teammate to join their org. */
export async function notifyTeamInvite(params: {
  toEmail: string;
  orgName: string;
  inviterName: string;
  token: string;
}): Promise<void> {
  await sendEmailSafely({
    to: params.toEmail,
    subject: `${params.inviterName} invited you to join ${params.orgName} on Staffic`,
    html: wrapper(
      `<p><strong>${params.inviterName}</strong> invited you to join <strong>${params.orgName}</strong> on Staffic.</p>` +
        `<p><a href="${APP_URL}/signup/invite/${params.token}">Accept your invite</a></p>` +
        `<p style="color: #71717a; font-size: 12px;">This link expires in 7 days. If you weren't expecting this, you can ignore it.</p>`,
    ),
  });
}

/** A pending agency was approved (or rejected) by a platform admin. */
export async function notifyAgencyApprovalDecision(params: {
  agencyOrgId: string;
  agencyOrgName: string;
  approved: boolean;
}): Promise<void> {
  const recipients = await emailsForOrg(params.agencyOrgId);
  const html = params.approved
    ? wrapper(`<p>Good news — <strong>${params.agencyOrgName}</strong> has been approved. You can now browse the open-requisition marketplace and submit candidates.</p><p><a href="${APP_URL}/dashboard/marketplace">Go to the marketplace</a></p>`)
    : wrapper(`<p>Your organization's application was not approved at this time. Contact Staffic support if you have questions.</p>`);

  await Promise.all(
    recipients.map((to) =>
      sendEmailSafely({
        to,
        subject: params.approved ? "Your agency has been approved" : "Update on your Staffic application",
        html,
      }),
    ),
  );
}
