"use client";

import { useActionState, useRef, useEffect } from "react";
import { createWorkerAction } from "./actions";

const SPECIALTIES = [
  { value: "LOCUM_TENENS", label: "Locum Tenens" },
  { value: "NURSING", label: "Nursing" },
  { value: "ALLIED_HEALTH", label: "Allied Health" },
  { value: "NON_CLINICAL", label: "Non-Clinical" },
];

export function NewWorkerForm() {
  const [errorMessage, formAction, isPending] = useActionState(createWorkerAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !errorMessage) formRef.current?.reset();
    wasPending.current = isPending;
  }, [isPending, errorMessage]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-white p-5">
      <div>
        <label className="text-sm font-medium text-ink">Name</label>
        <input name="name" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Sam Okafor, RN" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Specialty</label>
        <select name="specialty" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
          {SPECIALTIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Credentials (comma-separated)</label>
        <input name="credentials" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="RN, BLS, ACLS" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Email (optional)</label>
        <input name="email" type="email" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      {errorMessage && <p className="col-span-2 text-sm text-status-red">{errorMessage}</p>}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add to float pool"}
        </button>
      </div>
    </form>
  );
}
