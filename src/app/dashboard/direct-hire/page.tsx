import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isClientRole } from "@/lib/rbac";
import { listDirectHireJobsForOrg } from "@/lib/services/directHire";
import { NewJobForm } from "./new-job-form";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-status-green-tint text-status-green",
  CLOSED: "bg-hover text-muted",
  FILLED: "bg-status-blue-tint text-status-blue",
};

export default async function DirectHirePage() {
  const session = await auth();
  const user = session!.user;
  if (!isClientRole(user)) redirect("/dashboard");

  const jobs = await listDirectHireJobsForOrg(user);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-ink">Direct hire</h1>
        <p className="mb-4 text-sm text-muted">
          Permanent openings you source and hire for directly — no agency. Open postings show on the{" "}
          <a href="/jobs" target="_blank" rel="noreferrer" className="underline">
            public job board
          </a>
          .
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Post a job</h2>
        <NewJobForm />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Your postings</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted">No postings yet — post one above.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-white">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/direct-hire/${job.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-surface"
              >
                <div>
                  <p className="font-medium text-ink">{job.title}</p>
                  <p className="text-sm text-muted">{job.location}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted">{job._count.applications} application(s)</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
                    {job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
