import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123"; // local dev only — never use in a real environment

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const platformOrg = await prisma.organization.create({
    data: { name: "Staffic Internal", type: "PLATFORM" },
  });
  await prisma.user.create({
    data: {
      email: "admin@staffic.dev",
      passwordHash,
      name: "Platform Admin",
      role: "PLATFORM_ADMIN",
      organizationId: platformOrg.id,
    },
  });

  const clientOrg = await prisma.organization.create({
    data: { name: "Demo Regional Hospital", type: "CLIENT" },
  });
  const clientManager = await prisma.user.create({
    data: {
      email: "manager@demohospital.dev",
      passwordHash,
      name: "Hiring Manager",
      role: "CLIENT_MANAGER",
      organizationId: clientOrg.id,
    },
  });
  // A CLIENT_ADMIN too — team invites can only be sent by an org admin, so
  // the manager alone can't demo that feature. See "Try the team invites
  // feature" in README.md.
  await prisma.user.create({
    data: {
      email: "admin@demohospital.dev",
      passwordHash,
      name: "Hospital Admin",
      role: "CLIENT_ADMIN",
      organizationId: clientOrg.id,
    },
  });

  const agencyOrg = await prisma.organization.create({
    data: { name: "Demo Staffing Partners", type: "AGENCY" },
  });
  await prisma.user.create({
    data: {
      email: "recruiter@demostaffing.dev",
      passwordHash,
      name: "Agency Recruiter",
      role: "AGENCY_RECRUITER",
      organizationId: agencyOrg.id,
    },
  });
  // Likewise, an AGENCY_ADMIN so the agency side of team invites is demoable too.
  await prisma.user.create({
    data: {
      email: "admin@demostaffing.dev",
      passwordHash,
      name: "Agency Admin",
      role: "AGENCY_ADMIN",
      organizationId: agencyOrg.id,
    },
  });

  // A second agency, so agency scorecards / market benchmarks have more than one data point.
  const rivalAgencyOrg = await prisma.organization.create({
    data: { name: "Rival Locum Network", type: "AGENCY" },
  });
  await prisma.user.create({
    data: {
      email: "recruiter@rivallocum.dev",
      passwordHash,
      name: "Rival Recruiter",
      role: "AGENCY_RECRUITER",
      organizationId: rivalAgencyOrg.id,
    },
  });

  // Requisition #1 — still open, has one pending submission.
  const openRequisition = await prisma.requisition.create({
    data: {
      organizationId: clientOrg.id,
      title: "ICU RN — Night Shift",
      specialty: "NURSING",
      location: "Denver, CO",
      rateMin: 65,
      rateMax: 85,
      status: "OPEN",
      createdById: clientManager.id,
    },
  });

  const candidate = await prisma.candidate.create({
    data: {
      organizationId: agencyOrg.id,
      name: "Jordan Rivera, RN",
      email: "jordan.rivera@example.com",
      credentials: ["RN", "BLS", "ACLS"],
    },
  });

  await prisma.submission.create({
    data: {
      requisitionId: openRequisition.id,
      candidateId: candidate.id,
      agencyOrgId: agencyOrg.id,
      proposedRate: 72,
      status: "SUBMITTED",
    },
  });

  // Requisition #2 — already filled, with an approved + placed submission and
  // a losing (rejected) submission from a rival agency, so reports have
  // something real to aggregate: time-to-fill, approval rate, rate spread.
  const filledRequisitionCreatedAt = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const filledRequisition = await prisma.requisition.create({
    data: {
      organizationId: clientOrg.id,
      title: "Locum Hospitalist — 4 Week Coverage",
      specialty: "LOCUM_TENENS",
      location: "Boulder, CO",
      rateMin: 180,
      rateMax: 220,
      status: "FILLED",
      createdById: clientManager.id,
      createdAt: filledRequisitionCreatedAt,
    },
  });

  const winningCandidate = await prisma.candidate.create({
    data: {
      organizationId: agencyOrg.id,
      name: "Dr. Amara Osei",
      email: "amara.osei@example.com",
      credentials: ["MD", "Board Certified — Internal Medicine"],
    },
  });
  const losingCandidate = await prisma.candidate.create({
    data: {
      organizationId: rivalAgencyOrg.id,
      name: "Dr. Peter Lindqvist",
      email: "peter.lindqvist@example.com",
      credentials: ["MD", "Board Certified — Family Medicine"],
    },
  });

  const winningSubmission = await prisma.submission.create({
    data: {
      requisitionId: filledRequisition.id,
      candidateId: winningCandidate.id,
      agencyOrgId: agencyOrg.id,
      proposedRate: 205,
      status: "APPROVED",
      reviewedById: clientManager.id,
      reviewedAt: new Date(filledRequisitionCreatedAt.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.submission.create({
    data: {
      requisitionId: filledRequisition.id,
      candidateId: losingCandidate.id,
      agencyOrgId: rivalAgencyOrg.id,
      proposedRate: 215,
      status: "REJECTED",
      reviewedById: clientManager.id,
      reviewedAt: new Date(filledRequisitionCreatedAt.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
  });
  const activePlacement = await prisma.placement.create({
    data: {
      submissionId: winningSubmission.id,
      startDate: new Date(filledRequisitionCreatedAt.getTime() + 6 * 24 * 60 * 60 * 1000),
      actualRate: 200,
      status: "ACTIVE",
      createdAt: new Date(filledRequisitionCreatedAt.getTime() + 6 * 24 * 60 * 60 * 1000),
    },
  });

  // Phase 4 — timesheets + an invoice against the active placement above.
  // Week 1: approved and already invoiced (PAID). Week 2: approved but not
  // yet invoiced. Week 3: still SUBMITTED, waiting on the client to review —
  // so /dashboard/timesheets has something in every state out of the box.
  const week1Start = new Date(activePlacement.startDate);
  const week2Start = new Date(week1Start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const week3Start = new Date(week1Start.getTime() + 14 * 24 * 60 * 60 * 1000);

  const week1Timesheet = await prisma.timesheet.create({
    data: {
      placementId: activePlacement.id,
      weekStartDate: week1Start,
      hoursWorked: 40,
      status: "APPROVED",
      submittedById: (await prisma.user.findUniqueOrThrow({ where: { email: "recruiter@demostaffing.dev" } })).id,
      reviewedById: clientManager.id,
      reviewedAt: new Date(week1Start.getTime() + 8 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.timesheet.create({
    data: {
      placementId: activePlacement.id,
      weekStartDate: week2Start,
      hoursWorked: 36,
      status: "APPROVED",
      submittedById: (await prisma.user.findUniqueOrThrow({ where: { email: "recruiter@demostaffing.dev" } })).id,
      reviewedById: clientManager.id,
      reviewedAt: new Date(week2Start.getTime() + 8 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.timesheet.create({
    data: {
      placementId: activePlacement.id,
      weekStartDate: week3Start,
      hoursWorked: 40,
      status: "SUBMITTED",
      submittedById: (await prisma.user.findUniqueOrThrow({ where: { email: "recruiter@demostaffing.dev" } })).id,
    },
  });

  const paidInvoice = await prisma.invoice.create({
    data: {
      placementId: activePlacement.id,
      clientOrgId: clientOrg.id,
      agencyOrgId: agencyOrg.id,
      periodStart: week1Start,
      periodEnd: week1Start,
      totalHours: 40,
      totalAmount: 40 * 200,
      status: "PAID",
    },
  });
  await prisma.timesheet.update({ where: { id: week1Timesheet.id }, data: { invoiceId: paidInvoice.id } });

  // A third agency that self-registered but hasn't been reviewed yet —
  // demonstrates the Phase 3 approval queue at /dashboard/admin/agencies.
  const pendingAgencyOrg = await prisma.organization.create({
    data: { name: "Newcomer Health Staffing", type: "AGENCY", approvalStatus: "PENDING" },
  });
  await prisma.user.create({
    data: {
      email: "recruiter@newcomerhealth.dev",
      passwordHash,
      name: "Newcomer Recruiter",
      role: "AGENCY_ADMIN",
      organizationId: pendingAgencyOrg.id,
    },
  });

  // Internal float pool demo data — the client's own bench, no agency involved.
  const floatWorker = await prisma.floatPoolWorker.create({
    data: {
      organizationId: clientOrg.id,
      name: "Priya Natarajan, RN",
      email: "priya.natarajan@demohospital.dev",
      specialty: "NURSING",
      credentials: ["RN", "BLS"],
      status: "ACTIVE",
    },
  });
  await prisma.floatPoolAssignment.create({
    data: {
      workerId: floatWorker.id,
      organizationId: clientOrg.id,
      unit: "ED",
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
      createdById: clientManager.id,
    },
  });

  // Direct sourcing (Phase 4 — SourceDirect equivalent): a permanent-hire
  // posting with one application already in, so /dashboard/direct-hire and
  // the public /jobs board both have something to show.
  const directHireJob = await prisma.directHireJob.create({
    data: {
      organizationId: clientOrg.id,
      title: "Staff RN — Medical Surgical",
      specialty: "NURSING",
      location: "Denver, CO",
      description: "Full-time permanent staff RN position on our med-surg unit. Direct hire, not a locum/travel role.",
      salaryMin: 75000,
      salaryMax: 95000,
      status: "OPEN",
      createdById: clientManager.id,
    },
  });
  await prisma.jobApplication.create({
    data: {
      jobId: directHireJob.id,
      applicantName: "Morgan Ellis",
      applicantEmail: "morgan.ellis@example.com",
      coverNote: "5 years med-surg experience, relocating to the Denver area next month.",
      status: "APPLIED",
    },
  });

  console.log("Seed complete. Demo logins (password: %s):", DEMO_PASSWORD);
  console.log("  admin@staffic.dev            (PLATFORM_ADMIN)");
  console.log("  manager@demohospital.dev     (CLIENT_MANAGER)");
  console.log("  admin@demohospital.dev       (CLIENT_ADMIN — can send team invites)");
  console.log("  recruiter@demostaffing.dev   (AGENCY_RECRUITER)");
  console.log("  admin@demostaffing.dev       (AGENCY_ADMIN — can send team invites)");
  console.log("  recruiter@rivallocum.dev     (AGENCY_RECRUITER, rival agency)");
  console.log("  recruiter@newcomerhealth.dev (AGENCY_ADMIN, PENDING approval)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
