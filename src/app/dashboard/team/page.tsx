import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { listTeamMembers, listInvitesForOrg } from "@/lib/services/invites";
import { InviteForm } from "./invite-form";
import { revokeInviteAction } from "./actions";

export default async function TeamPage() {
  const session = await auth();
  const user = session!.user;

  const isAdmin = user.role === "CLIENT_ADMIN" || user.role === "AGENCY_ADMIN" || user.role === "PLATFORM_ADMIN";
  const orgKind: "CLIENT" | "AGENCY" | null = isClientRole(user) ? "CLIENT" : isAgencyRole(user) ? "AGENCY" : null;

  const [members, invites] = await Promise.all([
    listTeamMembers(user),
    isAdmin ? listInvitesForOrg(user) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-ink">Team</h1>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Members</h2>
        <div className="overflow-x-auto rounded-md border border-border bg-white">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted">Name</th>
                <th className="px-4 py-2 text-left font-medium text-muted">Email</th>
                <th className="px-4 py-2 text-left font-medium text-muted">Role</th>
                <th className="px-4 py-2 text-left font-medium text-muted">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-ink">{m.name}</td>
                  <td className="px-4 py-2 text-ink">{m.email}</td>
                  <td className="px-4 py-2 text-ink">{m.role}</td>
                  <td className="px-4 py-2 text-ink">{new Date(m.createdAt).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && orgKind && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Invite a teammate</h2>
          <InviteForm orgKind={orgKind} />
        </div>
      )}

      {isAdmin && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Pending invites</h2>
          {invites.length === 0 ? (
            <p className="text-sm text-muted">No pending invites.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-border bg-white p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{inv.email}</p>
                    <p className="text-xs text-muted">
                      {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <form action={revokeInviteAction.bind(null, inv.id)}>
                    <button className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface">
                      Revoke
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <p className="text-sm text-muted">Only an org admin can invite new teammates or manage pending invites.</p>
      )}
    </div>
  );
}
