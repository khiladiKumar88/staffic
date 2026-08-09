import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { listTimesheetsForOrg } from "@/lib/services/timesheets";
import { listPlacementsForAgency } from "@/lib/services/placements";
import { NewTimesheetForm } from "./new-timesheet-form";
import { reviewTimesheetAction } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-hover text-ink",
  APPROVED: "bg-status-green-tint text-status-green",
  REJECTED: "bg-status-red-tint text-status-red",
};

export default async function TimesheetsPage() {
  const session = await auth();
  const user = session!.user;
  if (!isClientRole(user) && !isAgencyRole(user)) redirect("/dashboard");

  const timesheets = await listTimesheetsForOrg(user);
  const placements = isAgencyRole(user) ? await listPlacementsForAgency(user) : [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-ink">Timesheets</h1>

      {isAgencyRole(user) && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">Submit hours</h2>
          <NewTimesheetForm
            placements={placements.map((p) => ({
              id: p.id,
              label: `${p.submission.candidate.name} — ${p.submission.requisition.title}`,
            }))}
          />
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">
          {isClientRole(user) ? "Timesheets" : "Your submitted timesheets"}
        </h2>
        {timesheets.length === 0 ? (
          <p className="text-sm text-muted">Nothing here yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-white">
            {timesheets.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-ink">
                    {t.placement.submission.candidate.name} — {t.placement.submission.requisition.title}
                  </p>
                  <p className="text-sm text-muted">
                    Week of {new Date(t.weekStartDate).toLocaleDateString("en-US")} · {t.hoursWorked.toString()} hours ·{" "}
                    {t.placement.submission.agencyOrg.name}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[t.status]}`}>
                    {t.status}
                  </span>
                  {isClientRole(user) && t.status === "SUBMITTED" && (
                    <>
                      <form action={reviewTimesheetAction.bind(null, t.id, true)}>
                        <button className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark">
                          Approve
                        </button>
                      </form>
                      <form action={reviewTimesheetAction.bind(null, t.id, false)}>
                        <button className="rounded-lg bg-status-red px-2.5 py-1 text-xs font-medium text-white hover:opacity-90">
                          Reject
                        </button>
                      </form>
                    </>
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
