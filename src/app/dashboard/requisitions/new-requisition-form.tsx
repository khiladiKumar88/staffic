"use client";

import { useActionState, useRef, useEffect } from "react";
import { createRequisitionAction } from "./actions";
import { Button } from "@/components/ui/Button";

const SPECIALTIES = [
  { value: "LOCUM_TENENS", label: "Locum Tenens" },
  { value: "NURSING", label: "Nursing" },
  { value: "ALLIED_HEALTH", label: "Allied Health" },
  { value: "NON_CLINICAL", label: "Non-Clinical" },
];

const inputClass =
  "mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none";

export function NewRequisitionForm() {
  const [errorMessage, formAction, isPending] = useActionState(createRequisitionAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // Reset the form after a successful (error-free) submit.
  useEffect(() => {
    if (wasPending.current && !isPending && !errorMessage) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, errorMessage]);

  return (
    <div className="rounded-md border border-border bg-white">
      <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-4 p-5">
        <div className="col-span-2">
          <label className="text-sm font-medium text-ink">Title</label>
          <input name="title" required className={inputClass} placeholder="ICU RN — Night Shift" />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Specialty</label>
          <select name="specialty" required className={inputClass}>
            {SPECIALTIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Location</label>
          <input name="location" required className={inputClass} placeholder="Denver, CO" />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Rate min ($/hr)</label>
          <input name="rateMin" type="number" step="0.01" required className={inputClass} />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Rate max ($/hr)</label>
          <input name="rateMax" type="number" step="0.01" required className={inputClass} />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium text-ink">Description (optional)</label>
          <textarea name="description" rows={2} className={inputClass} />
        </div>

        {errorMessage && <p className="col-span-2 text-sm text-status-red">{errorMessage}</p>}

        <div className="col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Posting…" : "Post requisition"}
          </Button>
        </div>
      </form>
    </div>
  );
}
