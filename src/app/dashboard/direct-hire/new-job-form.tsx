"use client";

import { useActionState, useRef, useEffect } from "react";
import { createJobAction } from "./actions";

const SPECIALTIES = [
  { value: "LOCUM_TENENS", label: "Locum Tenens" },
  { value: "NURSING", label: "Nursing" },
  { value: "ALLIED_HEALTH", label: "Allied Health" },
  { value: "NON_CLINICAL", label: "Non-Clinical" },
];

export function NewJobForm() {
  const [errorMessage, formAction, isPending] = useActionState(createJobAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !errorMessage) formRef.current?.reset();
    wasPending.current = isPending;
  }, [isPending, errorMessage]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-4 rounded-md border border-border bg-white p-5">
      <div className="col-span-2">
        <label className="text-sm font-medium text-ink">Job title</label>
        <input name="title" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Staff RN — Medical Surgical" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Specialty</label>
        <select name="specialty" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm">
          {SPECIALTIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Location</label>
        <input name="location" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Salary min (optional)</label>
        <input name="salaryMin" type="number" step="1000" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Salary max (optional)</label>
        <input name="salaryMax" type="number" step="1000" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium text-ink">Description (optional)</label>
        <textarea name="description" rows={3} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>

      {errorMessage && <p className="col-span-2 text-sm text-status-red">{errorMessage}</p>}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {isPending ? "Posting…" : "Post job"}
        </button>
      </div>
    </form>
  );
}
