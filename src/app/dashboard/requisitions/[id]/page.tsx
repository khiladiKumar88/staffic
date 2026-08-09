import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getRequisitionDetail } from "@/lib/services/requisitions";
import { updateSubmissionStatusAction } from "../actions";
import { PlacementForm } from "./placement-form";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </Card>
  );
}

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const requisition = await getRequisitionDetail(session!.user, id);
  if (!requisition) notFound();

  const pendingCount = requisition.submissions.filter((s) =>
    ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUESTED"].includes(s.status),
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/dashboard/requisitions" className="text-sm font-medium text-muted hover:text-ink">
          ‹ Back to requisitions
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{requisition.title}</h1>
          <Badge status={requisition.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {requisition.specialty.replaceAll("_", " ")} · Posted by {requisition.createdBy.name}
        </p>
        {requisition.description && <p className="mt-3 max-w-2xl text-sm text-ink">{requisition.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetaCard label="Specialty" value={requisition.specialty.replaceAll("_", " ")} />
        <MetaCard label="Location" value={requisition.location} />
        <MetaCard
          label="Pay rate"
          value={`$${requisition.rateMin.toString()}–${requisition.rateMax.toString()}/hr`}
        />
        <MetaCard
          label="Start date"
          value={requisition.startDate ? new Date(requisition.startDate).toLocaleDateString("en-US") : "Flexible"}
        />
        <MetaCard label="Posted" value={new Date(requisition.createdAt).toLocaleDateString("en-US")} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">
            Candidate submissions ({requisition.submissions.length})
          </h2>
          {pendingCount > 0 && <span className="text-sm text-status-amber">{pendingCount} pending review</span>}
        </div>

        {requisition.submissions.length === 0 ? (
          <p className="text-sm text-muted">No submissions yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {requisition.submissions.map((submission) => (
              <Card key={submission.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                      {initials(submission.candidate.name)}
                    </div>
                    <div>
                      <p className="font-medium text-ink">{submission.candidate.name}</p>
                      <p className="text-sm text-muted">
                        {submission.agencyOrg.name} · ${submission.proposedRate.toString()}/hr · Submitted{" "}
                        {new Date(submission.createdAt).toLocaleDateString("en-US")}
                      </p>
                      {submission.candidate.credentials.length > 0 && (
                        <p className="mt-1 text-xs text-muted">{submission.candidate.credentials.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <Badge status={submission.status} />
                </div>

                {["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUESTED"].includes(submission.status) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {submission.status === "SUBMITTED" && (
                      <form action={updateSubmissionStatusAction.bind(null, submission.id, "UNDER_REVIEW")}>
                        <Button type="submit" variant="secondary">
                          Mark under review
                        </Button>
                      </form>
                    )}
                    <form action={updateSubmissionStatusAction.bind(null, submission.id, "INTERVIEW_REQUESTED")}>
                      <Button type="submit" variant="secondary">
                        Request interview
                      </Button>
                    </form>
                    <form action={updateSubmissionStatusAction.bind(null, submission.id, "APPROVED")}>
                      <Button type="submit" variant="primary">
                        Approve
                      </Button>
                    </form>
                    <form action={updateSubmissionStatusAction.bind(null, submission.id, "REJECTED")}>
                      <Button type="submit" variant="danger">
                        Reject
                      </Button>
                    </form>
                  </div>
                )}

                {submission.status === "APPROVED" && !submission.placement && (
                  <PlacementForm submissionId={submission.id} />
                )}

                {submission.placement && (
                  <p className="mt-3 text-sm text-status-blue">
                    Placed — starts {new Date(submission.placement.startDate).toLocaleDateString("en-US")} at $
                    {submission.placement.actualRate.toString()}/hr ({submission.placement.status})
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
