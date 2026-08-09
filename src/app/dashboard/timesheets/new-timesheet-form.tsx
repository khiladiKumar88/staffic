"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTimesheetAction } from "./actions";

interface PlacementOption {
  id: string;
  label: string;
}

export function NewTimesheetForm({ placements }: { placements: PlacementOption[] }) {
  const [errorMessage, formAction, isPending] = useActionState(createTimesheetAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !errorMessage) formRef.current?.reset();
    wasPending.current = isPending;
  }, [isPending, errorMessage]);

  if (placements.length === 0) {
    return <p className="text-sm text-muted">You don&apos;t have any placements to log hours against yet.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-white p-5">
      <div className="col-span-2">
        <label className="text-sm font-medium text-ink">Placement</label>
        <select name="placementId" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
          {placements.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Week starting (Monday)</label>
        <input name="weekStartDate" type="date" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Hours worked</label>
        <input name="hoursWorked" type="number" step="0.25" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium text-ink">Notes (optional)</label>
        <input name="notes" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      {errorMessage && <p className="col-span-2 text-sm text-status-red">{errorMessage}</p>}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit timesheet"}
        </button>
      </div>
    </form>
  );
}
