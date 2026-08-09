"use client";

import { useActionState } from "react";
import { generateInvoiceAction } from "./actions";

interface PlacementOption {
  id: string;
  label: string;
}

export function GenerateInvoiceForm({ placements }: { placements: PlacementOption[] }) {
  const [errorMessage, formAction, isPending] = useActionState(generateInvoiceAction, undefined);

  if (placements.length === 0) {
    return <p className="text-sm text-muted">No placements to invoice yet.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-white p-5">
      <div>
        <label className="block text-sm font-medium text-ink">Placement</label>
        <select name="placementId" required className="mt-1 rounded-lg border border-border px-3 py-2 text-sm">
          {placements.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "Generating…" : "Generate invoice from approved timesheets"}
      </button>
      {errorMessage && <p className="w-full text-sm text-status-red">{errorMessage}</p>}
    </form>
  );
}
