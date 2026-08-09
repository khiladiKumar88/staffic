"use client";

import { useActionState } from "react";
import { createPlacementAction } from "../actions";
import { Button } from "@/components/ui/Button";

export function PlacementForm({ submissionId }: { submissionId: string }) {
  const [errorMessage, formAction, isPending] = useActionState(createPlacementAction, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-surface p-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <div>
        <label className="block text-xs font-medium text-muted">Start date</label>
        <input
          name="startDate"
          type="date"
          required
          className="mt-1 rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">Actual rate ($/hr)</label>
        <input
          name="actualRate"
          type="number"
          step="0.01"
          required
          className="mt-1 w-28 rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <Button type="submit" disabled={isPending} className="py-1.5">
        {isPending ? "Saving…" : "Confirm placement"}
      </Button>
      {errorMessage && <p className="w-full text-sm text-status-red">{errorMessage}</p>}
    </form>
  );
}
