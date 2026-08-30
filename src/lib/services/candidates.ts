import { prisma } from "@/lib/prisma";
import { requireRoleAndOrg, requireOrgAccess, type SessionUser } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

export interface CreateCandidateInput {
  name: string;
  email?: string;
  phone?: string;
  credentials: string[];
}

export async function createCandidate(actor: SessionUser, input: CreateCandidateInput) {
  requireRoleAndOrg(actor, ["AGENCY_ADMIN", "AGENCY_RECRUITER"], actor.organizationId);

  const candidate = await prisma.candidate.create({
    data: { ...input, organizationId: actor.organizationId },
  });

  await logAuditEvent({
    actor,
    organizationId: actor.organizationId,
    action: "CANDIDATE_CREATE",
    entityType: "Candidate",
    entityId: candidate.id,
  });

  return candidate;
}

/** Candidate roster for the caller's own agency org. */
export async function listCandidatesForOrg(actor: SessionUser) {
  requireOrgAccess(actor, actor.organizationId);

  return prisma.candidate.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    take: 200, // P-01: cap to prevent unbounded result sets
    select: { id: true, name: true, email: true, credentials: true, createdAt: true, updatedAt: true, organizationId: true }, // P-16: only list-view fields
  });
}
