import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isClientRole } from "@/lib/rbac";
import { listFloatPoolWorkers, listFloatPoolAssignments } from "@/lib/services/floatPool";
import { NewWorkerForm } from "./new-worker-form";
import { NewAssignmentForm } from "./new-assignment-form";
import { updateAssignmentStatusAction } from "./actions";

const ASSIGNMENT_STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-hover text-ink",
  IN_PROGRESS: "bg-status-blue-tint text-status-blue",
  COMPLETED: "bg-status-green-tint text-status-green",
  CANCELLED: "bg-status-red-tint text-status-red",
};

export default async function FloatPoolPage() {
  const session = await auth();
  const user = session!.user;
  if (!isClientRole(user)) redirect("/dashboard");

  const [workers, assignments] = await Promise.all([
    listFloatPoolWorkers(user),
    listFloatPoolAssignments(user),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-ink">Internal float pool</h1>
        <p className="mb-4 text-sm text-muted">
          Your own bench of contingent workers — scheduled directly, no agency involved.
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Add a worker</h2>
        <NewWorkerForm />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Your bench ({workers.length})</h2>
        {workers.length === 0 ? (
          <p className="text-sm text-muted">No workers yet — add one above.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-white">
            {workers.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-ink">{w.name}</p>
                  <p className="text-sm text-muted">{w.specialty.replaceAll("_", " ")}</p>
                </div>
                <p className="text-sm text-muted">{w.credentials.join(", ") || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Schedule an assignment</h2>
        <NewAssignmentForm workers={workers.map((w) => ({ id: w.id, name: w.name }))} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Upcoming & recent assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted">No assignments scheduled yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-white">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-ink">
                    {a.worker.name} → {a.unit}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(a.startDate).toLocaleDateString("en-US")} – {new Date(a.endDate).toLocaleDateString("en-US")}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ASSIGNMENT_STATUS_STYLES[a.status]}`}>
                    {a.status.replaceAll("_", " ")}
                  </span>
                  {a.status === "SCHEDULED" && (
                    <>
                      <form action={updateAssignmentStatusAction.bind(null, a.id, "IN_PROGRESS")}>
                        <button className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface">
                          Start
                        </button>
                      </form>
                      <form action={updateAssignmentStatusAction.bind(null, a.id, "CANCELLED")}>
                        <button className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface">
                          Cancel
                        </button>
                      </form>
                    </>
                  )}
                  {a.status === "IN_PROGRESS" && (
                    <form action={updateAssignmentStatusAction.bind(null, a.id, "COMPLETED")}>
                      <button className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface">
                        Mark complete
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
