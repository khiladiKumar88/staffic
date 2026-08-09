import { prisma } from "@/lib/prisma";
import { requireRoleAndOrg, requireOrgAccess, ForbiddenError, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyNewJobApplication } from "@/lib/notifications";
import type { Specialty, DirectHireJobStatus, JobApplicationStatus } from "@prisma/client";

const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_MANAGER"] as const;

// ---------------------------------------------------------------------------
// Client-side management (authenticated)
// ---------------------------------------------------------------------------

export interface CreateDirectHireJobInput {
  title: string;
  specialty: Specialty;
  location: string;
  description?: string;
  salaryMin?: number;
  salaryMax?: number;
}

export async function createDirectHireJob(actor: SessionUser, input: CreateDirectHireJobInput) {
  requireRoleAndOrg(actor, [...CLIENT_ROLES], actor.organizationId);

  const job = await prisma.directHireJob.create({
    data: { ...input, organizationId: actor.organizationId, createdById: actor.id, status: "OPEN" },
  });

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "DIRECT_HIRE_JOB_CREATE",
    entityType: "DirectHireJob",
    entityId: job.id,
  });

  return job;
}

export async function listDirectHireJobsForOrg(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.directHireJob.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });
}

export async function getDirectHireJobDetail(actor: SessionUser, jobId: string) {
  const job = await prisma.directHireJob.findUnique({
    where: { id: jobId },
    include: { applications: { orderBy: { createdAt: "desc" } } },
  });
  if (!job) return null;

  requireOrgAccess(actor, job.organizationId);
  return job;
}

export async function updateDirectHireJobStatus(actor: SessionUser, jobId: string, status: DirectHireJobStatus) {
  const job = await prisma.directHireJob.findUnique({ where: { id: jobId } });
  if (!job) throw new ForbiddenError("Job not found");

  requireRoleAndOrg(actor, [...CLIENT_ROLES], job.organizationId);

  const updated = await prisma.directHireJob.update({ where: { id: jobId }, data: { status } });

  await logAuditEvent({
    actor,
    organizationId: job.organizationId,
    action: "DIRECT_HIRE_JOB_STATUS_CHANGE",
    entityType: "DirectHireJob",
    entityId: jobId,
    metadata: { from: job.status, to: status },
  });

  return updated;
}

export async function updateJobApplicationStatus(actor: SessionUser, applicationId: string, status: JobApplicationStatus) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application) throw new ForbiddenError("Application not found");

  requireRoleAndOrg(actor, [...CLIENT_ROLES], application.job.organizationId);

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status, reviewedById: actor.id, reviewedAt: new Date() },
  });

  await logAuditEvent({
    actor,
    organizationId: application.job.organizationId,
    action: "JOB_APPLICATION_STATUS_CHANGE",
    entityType: "JobApplication",
    entityId: applicationId,
    metadata: { from: application.status, to: status },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Public (unauthenticated) — the job board. Keep the surface area here
// deliberately tiny: two reads and one write, no session required.
// ---------------------------------------------------------------------------

export async function listPublicOpenJobs() {
  return prisma.directHireJob.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      specialty: true,
      location: true,
      salaryMin: true,
      salaryMax: true,
      createdAt: true,
      organization: { select: { name: true } },
    },
  });
}

export async function getPublicJobDetail(jobId: string) {
  return prisma.directHireJob.findFirst({
    where: { id: jobId, status: "OPEN" },
    select: {
      id: true,
      title: true,
      specialty: true,
      location: true,
      description: true,
      salaryMin: true,
      salaryMax: true,
      organization: { select: { name: true } },
    },
  });
}

// Spam/bot protection for the one truly public write path in the app (see
// docs/DECISIONS.md — this used to have none at all). Two layers, both
// DB-backed so they hold up across server restarts and multiple instances
// without needing Redis or an in-memory store:
//
// 1. Honeypot — a form field real users never see or fill in (hidden off
//    screen in apply-form.tsx). If it's non-empty, the submission is
//    silently dropped: no error, no DB write, so a scraper gets what looks
//    like a normal success and has no signal about what tripped it.
// 2. Rate limiting — caps applications per email per job, and per IP
//    across jobs, within a rolling window.
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_APPLICATIONS_PER_EMAIL_PER_JOB = 1;
const MAX_APPLICATIONS_PER_IP = 5;

async function enforceApplicationRateLimit(jobId: string, email: string, ipAddress: string | null): Promise<void> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const recentByEmail = await prisma.jobApplication.count({
    where: { jobId, applicantEmail: email, createdAt: { gte: since } },
  });
  if (recentByEmail >= MAX_APPLICATIONS_PER_EMAIL_PER_JOB) {
    throw new ForbiddenError("You've already applied to this job recently. Please wait a few minutes and try again.");
  }

  if (ipAddress) {
    const recentByIp = await prisma.jobApplication.count({
      where: { ipAddress, createdAt: { gte: since } },
    });
    if (recentByIp >= MAX_APPLICATIONS_PER_IP) {
      throw new ForbiddenError("Too many applications submitted recently. Please try again later.");
    }
  }
}

export interface SubmitJobApplicationInput {
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  coverNote?: string;
  /** Hidden form field — humans never fill this in. Non-empty means a bot. */
  honeypot?: string;
  /** Best-effort client IP, used only for rate limiting (see above). */
  ipAddress?: string | null;
}

export async function submitJobApplication(input: SubmitJobApplicationInput) {
  if (input.honeypot) {
    // Bot tripped the honeypot — return a shape that looks like success to
    // the caller (see route.ts/actions.ts) without touching the database.
    return { id: "noop", jobId: input.jobId, status: "APPLIED" as const, silentlyDropped: true };
  }

  const job = await prisma.directHireJob.findUnique({ where: { id: input.jobId } });
  if (!job || job.status !== "OPEN") {
    throw new ForbiddenError("This job is no longer accepting applications");
  }

  await enforceApplicationRateLimit(input.jobId, input.applicantEmail, input.ipAddress ?? null);

  const application = await prisma.jobApplication.create({
    data: {
      jobId: input.jobId,
      applicantName: input.applicantName,
      applicantEmail: input.applicantEmail,
      applicantPhone: input.applicantPhone,
      coverNote: input.coverNote,
      ipAddress: input.ipAddress ?? null,
      status: "APPLIED",
    },
  });

  // No "actor" here — this is an unauthenticated public submission. Audit
  // logging still matters (it's the only record a specific application
  // came in), but there's no SessionUser to attribute it to.
  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      organizationId: job.organizationId,
      action: "JOB_APPLICATION_CREATE",
      entityType: "JobApplication",
      entityId: application.id,
      metadata: { jobId: input.jobId },
    },
  });

  await notifyNewJobApplication({
    clientOrgId: job.organizationId,
    jobTitle: job.title,
    applicantName: input.applicantName,
  });

  return application;
}
