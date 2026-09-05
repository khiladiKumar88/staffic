import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAgencyRole } from "@/lib/rbac";
import { listOpenRequisitions } from "@/lib/services/requisitions";
import { listCandidatesForOrg } from "@/lib/services/candidates";
import { SubmitCandidateForm } from "./submit-candidate-form";

export default async function MarketplacePage() {
  const session = await auth();
  const user = session!.user;
  if (!isAgencyRole(user)) redirect("/dashboard");

  const [requisitions, candidates] = await Promise.all([
    listOpenRequisitions(user),
    listCandidatesForOrg(user),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">Open requisitions</h1>
      {candidates.length === 0 && (
        <p className="mb-4 rounded-md bg-status-amber-tint px-4 py-2 text-sm text-status-amber">
          Add a candidate to your roster before submitting to a requisition.
        </p>
      )}
      {requisitions.length === 0 ? (
        <p className="text-sm text-muted">No open requisitions right now — check back later.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {requisitions.map((req) => (
            <div key={req.id} className="rounded-md border border-border bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{req.title}</p>
                  <p className="text-sm text-muted">
                    {req.organization.name} · {req.location} · {req.specialty.replaceAll("_", " ")} · $
                    {req.rateMin.toString()}–${req.rateMax.toString()}/hr
                  </p>
                </div>
                <span className="text-xs text-muted">{req._count.submissions} submission(s) so far</span>
              </div>
              <div className="mt-3">
                <SubmitCandidateForm requisitionId={req.id} candidates={candidates} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
