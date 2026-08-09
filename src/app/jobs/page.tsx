import Link from "next/link";
import { listPublicOpenJobs } from "@/lib/services/directHire";

export const metadata = { title: "Open positions — Staffic" };

export default async function PublicJobBoardPage() {
  const jobs = await listPublicOpenJobs();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-ink">Open positions</h1>
      <p className="mb-8 text-sm text-muted">
        Permanent healthcare roles posted directly by hospitals and health systems on Staffic.
      </p>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted">No open positions right now — check back soon.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-white">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface">
              <div>
                <p className="font-medium text-ink">{job.title}</p>
                <p className="text-sm text-muted">
                  {job.organization.name} · {job.location} · {job.specialty.replaceAll("_", " ")}
                </p>
              </div>
              {job.salaryMin && job.salaryMax && (
                <p className="text-sm text-muted">
                  ${job.salaryMin.toString()}–${job.salaryMax.toString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
