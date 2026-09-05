import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAgencyRole } from "@/lib/rbac";
import { listSubmissionsForAgency } from "@/lib/services/submissions";

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-hover text-ink",
  UNDER_REVIEW: "bg-status-amber-tint text-status-amber",
  INTERVIEW_REQUESTED: "bg-status-amber-tint text-status-amber",
  APPROVED: "bg-status-green-tint text-status-green",
  REJECTED: "bg-status-red-tint text-status-red",
  WITHDRAWN: "bg-hover text-muted",
};

export default async function MySubmissionsPage() {
  const session = await auth();
  const user = session!.user;
  if (!isAgencyRole(user)) redirect("/dashboard");

  const submissions = await listSubmissionsForAgency(user);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">My submissions</h1>
      {submissions.length === 0 ? (
        <p className="text-sm text-muted">
          No submissions yet — browse the <a href="/dashboard/marketplace" className="underline">marketplace</a> to get started.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-white">
          {submissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-ink">{s.candidate.name}</p>
                <p className="text-sm text-muted">
                  {s.requisition.title} · {s.requisition.organization.name} · ${s.proposedRate.toString()}/hr
                </p>
                {s.placement && (
                  <p className="mt-1 text-sm text-status-blue">
                    Placed — starts {new Date(s.placement.startDate).toLocaleDateString("en-US")}
                  </p>
                )}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                {s.status.replaceAll("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
