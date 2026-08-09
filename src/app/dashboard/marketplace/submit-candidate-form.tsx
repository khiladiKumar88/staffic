"use client";

import { useActionState, useState } from "react";
import { submitCandidateAction } from "./actions";

interface Candidate {
  id: string;
  name: string;
}

export function SubmitCandidateForm({ requisitionId, candidates }: { requisitionId: string; candidates: Candidate[] }) {
  const [open, setOpen] = useState(false);
  const [errorMessage, formAction, isPending] = useActionState(submitCandidateAction, undefined);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={candidates.length === 0}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-40"
        title={candidates.length === 0 ? "Add a candidate first" : undefined}
      >
        Submit a candidate
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-surface p-3">
      <input type="hidden" name="requisitionId" value={requisitionId} />
      <div>
        <label className="block text-xs font-medium text-muted">Candidate</label>
        <select name="candidateId" required className="mt-1 rounded-lg border border-border px-2 py-1 text-sm">
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">Proposed rate ($/hr)</label>
        <input name="proposedRate" type="number" step="0.01" required className="mt-1 w-28 rounded-lg border border-border px-2 py-1 text-sm" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
        Cancel
      </button>
      {errorMessage && <p className="w-full text-sm text-status-red">{errorMessage}</p>}
    </form>
  );
}
