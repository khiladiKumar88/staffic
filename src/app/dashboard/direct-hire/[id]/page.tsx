import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDirectHireJobDetail } from "@/lib/services/directHire";
import { updateJobStatusAction, updateApplicationStatusAction } from "../actions";

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  APPLIED: "bg-hover text-ink",
  UNDER_REVIEW: "bg-status-amber-tint text-status-amber",
  INTERVIEWING: "bg-status-amber-tint text-status-amber",
  OFFERED: "bg-status-blue-tint text-status-blue",
  HIRED: "bg-status-green-tint text-status-green",
  REJECTED: "bg-status-red-tint text-status-red",
};

const NEXT_STATUSES = ["UNDER_REVIEW", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED"] as const;

export default async function DirectHireJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const job = await getDirectHireJobDetail(session!.user, id);
  if (!job) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{job.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {job.location} · {job.specialty.replaceAll("_", " ")}
            {job.salaryMin && job.salaryMax ? ` · $${job.salaryMin.toString()}–$${job.salaryMax.toString()}` : ""}
          </p>
          {job.description && <p className="mt-3 max-w-2xl text-sm text-ink">{job.description}</p>}
        </div>
        {job.status === "OPEN" && (
          <div className="flex gap-2">
            <form action={updateJobStatusAction.bind(null, job.id, "CLOSED")}>
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface">
                Close posting
              </button>
            </form>
            <form action={updateJobStatusAction.bind(null, job.id, "FILLED")}>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark">
                Mark filled
              </button>
            </form>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Applications ({job.applications.length})</h2>
        {job.applications.length === 0 ? (
          <p className="text-sm text-muted">No applications yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {job.applications.map((app) => (
              <div key={app.id} className="rounded-lg border border-border bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-ink">{app.applicantName}</p>
                    <p className="text-sm text-muted">
                      {app.applicantEmail}
                      {app.applicantPhone ? ` · ${app.applicantPhone}` : ""}
                    </p>
                    {app.coverNote && <p className="mt-2 max-w-xl text-sm text-ink">{app.coverNote}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${APPLICATION_STATUS_STYLES[app.status]}`}>
                    {app.status.replaceAll("_", " ")}
                  </span>
                </div>
                {!["HIRED", "REJECTED"].includes(app.status) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {NEXT_STATUSES.filter((s) => s !== app.status).map((status) => (
                      <form key={status} action={updateApplicationStatusAction.bind(null, app.id, status, job.id)}>
                        <button className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface">
                          {status.replaceAll("_", " ")}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
