import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAgencyRole } from "@/lib/rbac";
import { listCandidatesForOrg } from "@/lib/services/candidates";
import { NewCandidateForm } from "./new-candidate-form";

export default async function CandidatesPage() {
  const session = await auth();
  const user = session!.user;
  if (!isAgencyRole(user)) redirect("/dashboard");

  const candidates = await listCandidatesForOrg(user);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-xl font-semibold text-ink">Add a candidate</h1>
        <NewCandidateForm />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Your roster</h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">No candidates yet — add one above.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-white">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-sm text-muted">{c.email ?? "No email on file"}</p>
                </div>
                <p className="text-sm text-muted">{c.credentials.join(", ") || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
