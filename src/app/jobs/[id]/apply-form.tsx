"use client";

import { useActionState } from "react";
import { applyToJobAction } from "./actions";

export function ApplyForm({ jobId }: { jobId: string }) {
  const [result, formAction, isPending] = useActionState(applyToJobAction, undefined);

  if (result === "SUCCESS") {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-5 text-sm text-status-green">
        Your application was submitted. The hiring team will be in touch if it&apos;s a fit.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border border-border bg-white p-5">
      <input type="hidden" name="jobId" value={jobId} />

      {/* Honeypot — invisible to real users, off screen and unreachable by
          tab, but a naive bot filling every input will populate it. Any
          non-empty value here silently drops the submission server-side. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Full name</label>
        <input name="applicantName" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Email</label>
        <input name="applicantEmail" type="email" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Phone (optional)</label>
        <input name="applicantPhone" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Cover note (optional)</label>
        <textarea name="coverNote" rows={4} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>

      {result && result !== "SUCCESS" && <p className="text-sm text-status-red">{result}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
