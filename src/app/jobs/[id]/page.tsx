import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicJobDetail } from "@/lib/services/directHire";
import { ApplyForm } from "./apply-form";

export default async function PublicJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getPublicJobDetail(id);
  if (!job) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/jobs" className="text-sm text-muted hover:text-ink">
        ← All open positions
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-ink">{job.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {job.organization.name} · {job.location} · {job.specialty.replaceAll("_", " ")}
        {job.salaryMin && job.salaryMax ? ` · $${job.salaryMin.toString()}–$${job.salaryMax.toString()}` : ""}
      </p>
      {job.description && <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{job.description}</p>}

      <h2 className="mb-4 mt-8 text-lg font-semibold text-ink">Apply</h2>
      <ApplyForm jobId={job.id} />
    </div>
  );
}
