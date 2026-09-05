"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCandidateAction } from "./actions";

export function NewCandidateForm() {
  const [errorMessage, formAction, isPending] = useActionState(createCandidateAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !errorMessage) formRef.current?.reset();
    wasPending.current = isPending;
  }, [isPending, errorMessage]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-4 rounded-md border border-border bg-white p-5">
      <div>
        <label className="text-sm font-medium text-ink">Name</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Jordan Rivera, RN" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Credentials (comma-separated)</label>
        <input name="credentials" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="RN, BLS, ACLS" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Email (optional)</label>
        <input name="email" type="email" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Phone (optional)</label>
        <input name="phone" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>

      {errorMessage && <p className="col-span-2 text-sm text-status-red">{errorMessage}</p>}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add candidate"}
        </button>
      </div>
    </form>
  );
}
