import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/rbac";
import { listPendingAgencies } from "@/lib/services/organizations";
import { decideAgencyApprovalAction } from "./actions";

export default async function PendingAgenciesPage() {
  const session = await auth();
  const user = session!.user;
  if (!isPlatformAdmin(user)) redirect("/dashboard");

  const pending = await listPendingAgencies(user);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">Pending agencies</h1>
      {pending.length === 0 ? (
        <p className="text-sm text-muted">No agencies waiting on review.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((org) => (
            <div key={org.id} className="rounded-md border border-border bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{org.name}</p>
                  <p className="text-sm text-muted">
                    Signed up {new Date(org.createdAt).toLocaleDateString("en-US")} ·{" "}
                    {org.users.map((u) => `${u.name} (${u.email})`).join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={decideAgencyApprovalAction.bind(null, org.id, true)}>
                    <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark">
                      Approve
                    </button>
                  </form>
                  <form action={decideAgencyApprovalAction.bind(null, org.id, false)}>
                    <button className="rounded-md bg-status-red px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
