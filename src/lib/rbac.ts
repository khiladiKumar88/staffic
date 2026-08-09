import type { UserRole } from "@prisma/client";

/**
 * Central RBAC helpers. Every API route / server action that touches
 * requisitions, candidates, submissions, or placements should go through
 * these — never trust organizationId from the request body/query alone.
 *
 * Design principle (see docs/PLAN.md §4): least-privilege, org-scoped by
 * default. PLATFORM_ADMIN is the only role that can cross org boundaries,
 * and every use of that escape hatch should be audit-logged by the caller.
 */

export type SessionUser = {
  id: string;
  organizationId: string;
  role: UserRole;
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

const CLIENT_ROLES: UserRole[] = ["CLIENT_ADMIN", "CLIENT_MANAGER"];
const AGENCY_ROLES: UserRole[] = ["AGENCY_ADMIN", "AGENCY_RECRUITER"];

export function isPlatformAdmin(user: SessionUser): boolean {
  return user.role === "PLATFORM_ADMIN";
}

export function isClientRole(user: SessionUser): boolean {
  return CLIENT_ROLES.includes(user.role);
}

export function isAgencyRole(user: SessionUser): boolean {
  return AGENCY_ROLES.includes(user.role);
}

/** Throws unless the user holds one of the allowed roles (or is a platform admin). */
export function requireRole(user: SessionUser, allowed: UserRole[]): void {
  if (isPlatformAdmin(user)) return;
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`Role ${user.role} is not permitted to perform this action`);
  }
}

/**
 * Throws unless the user belongs to the given organization (or is a
 * platform admin). Use this on every read/write of an org-scoped record
 * before returning data or applying a mutation.
 */
export function requireOrgAccess(user: SessionUser, organizationId: string): void {
  if (isPlatformAdmin(user)) return;
  if (user.organizationId !== organizationId) {
    throw new ForbiddenError("You do not have access to this organization's data");
  }
}

/**
 * Convenience combo: role check + org-scope check in one call. This is
 * the one most route handlers want.
 */
export function requireRoleAndOrg(
  user: SessionUser,
  allowedRoles: UserRole[],
  organizationId: string,
): void {
  requireRole(user, allowedRoles);
  requireOrgAccess(user, organizationId);
}
