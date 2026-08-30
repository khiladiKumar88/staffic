/**
 * Lightweight dashboard data loader (P-24/P-25/P-26).
 *
 * Replaces full-list fetches with targeted count/groupBy queries and
 * short `take` limits for the "recent" tables.
 */

import { prisma } from "@/lib/prisma";
import { type SessionUser, isClientRole, isAgencyRole } from "@/lib/rbac";

export interface ClientDashboardData {
  type: "client";
  reqOpen: number;
  reqOnHold: number;
  reqFilled: number;
  reqTotal: number;
  subToReview: number;
  subApproved: number;
  subPlacements: number;
  subTotal: number;
  recentRequisitions: {
    id: string;
    title: string;
    specialty: string;
    status: string;
    _count: { submissions: number };
  }[];
}

export interface AgencyDashboardData {
  type: "agency";
  candidateCount: number;
  subPending: number;
  subApproved: number;
  subPlacements: number;
  subTotal: number;
  recentSubmissions: {
    id: string;
    status: string;
    candidate: { name: string };
    requisition: { title: string };
  }[];
}

export async function getDashboardCounts(
  user: SessionUser,
): Promise<ClientDashboardData | AgencyDashboardData | null> {
  if (isClientRole(user)) {
    const orgId = user.organizationId;

    // All queries run in parallel — no sequential awaits.
    const [reqCounts, subCounts, placementCount, recentRequisitions] =
      await Promise.all([
        // Requisition counts grouped by status
        prisma.requisition.groupBy({
          by: ["status"],
          where: { organizationId: orgId },
          _count: true,
        }),
        // Submission counts grouped by status
        prisma.submission.groupBy({
          by: ["status"],
          where: { requisition: { organizationId: orgId } },
          _count: true,
        }),
        // Placement count (submissions that became placements)
        prisma.placement.count({
          where: { submission: { requisition: { organizationId: orgId } } },
        }),
        // Only the 5 most recent requisitions for the table
        prisma.requisition.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            specialty: true,
            status: true,
            _count: { select: { submissions: true } },
          },
        }),
      ]);

    const reqMap = Object.fromEntries(
      reqCounts.map((r) => [r.status, r._count]),
    );
    const subMap = Object.fromEntries(
      subCounts.map((s) => [s.status, s._count]),
    );

    return {
      type: "client",
      reqOpen: reqMap["OPEN"] ?? 0,
      reqOnHold: reqMap["ON_HOLD"] ?? 0,
      reqFilled: reqMap["FILLED"] ?? 0,
      reqTotal: Object.values(reqMap).reduce((a, b) => a + b, 0),
      subToReview: (subMap["SUBMITTED"] ?? 0) + (subMap["UNDER_REVIEW"] ?? 0),
      subApproved: subMap["APPROVED"] ?? 0,
      subPlacements: placementCount,
      subTotal: Object.values(subMap).reduce((a, b) => a + b, 0),
      recentRequisitions,
    };
  }

  if (isAgencyRole(user)) {
    const orgId = user.organizationId;

    const [candidateCount, subCounts, placementCount, recentSubmissions] =
      await Promise.all([
        prisma.candidate.count({ where: { organizationId: orgId } }),
        prisma.submission.groupBy({
          by: ["status"],
          where: { agencyOrgId: orgId },
          _count: true,
        }),
        prisma.placement.count({
          where: { submission: { agencyOrgId: orgId } },
        }),
        prisma.submission.findMany({
          where: { agencyOrgId: orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            candidate: { select: { name: true } },
            requisition: { select: { title: true } },
          },
        }),
      ]);

    const subMap = Object.fromEntries(
      subCounts.map((s) => [s.status, s._count]),
    );

    return {
      type: "agency",
      candidateCount,
      subPending: (subMap["SUBMITTED"] ?? 0) + (subMap["UNDER_REVIEW"] ?? 0),
      subApproved: subMap["APPROVED"] ?? 0,
      subPlacements: placementCount,
      subTotal: Object.values(subMap).reduce((a, b) => a + b, 0),
      recentSubmissions,
    };
  }

  return null;
}
