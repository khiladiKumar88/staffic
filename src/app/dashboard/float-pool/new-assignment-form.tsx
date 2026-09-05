"use client";

import { useActionState, useRef, useEffect } from "react";
import { createAssignmentAction } from "./actions";

interface Worker {
  id: string;
  name: string;
}

export function NewAssignmentForm({ workers }: { workers: Worker[] }) {
  const [errorMessage, formAction, isPending] = useActionState(createAssignmentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !errorMessage) formRef.current?.reset();
    wasPending.current = isPending;
  }, [isPending, errorMessage]);

  if (workers.length === 0) {
    return <p className="text-sm text-muted">Add a worker to your float pool before scheduling an assignment.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-4 rounded-md border border-border bg-white p-5">
      <div>
        <label className="text-sm font-medium text-ink">Worker</label>
        <select name="workerId" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm">
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Unit</label>
        <input name="unit" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="ICU - 4th Floor" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Start date</label>
        <input name="startDate" type="date" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">End date</label>
        <input name="endDate" type="date" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium text-ink">Notes (optional)</label>
        <input name="notes" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>

      {errorMessage && <p className="col-span-2 text-sm text-status-red">{errorMessage}</p>}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {isPending ? "Scheduling…" : "Schedule assignment"}
        </button>
      </div>
    </form>
  );
}
