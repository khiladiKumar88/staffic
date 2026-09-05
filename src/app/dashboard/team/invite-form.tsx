"use client";

import { useActionState } from "react";
import { createInviteAction } from "./actions";

const ROLE_OPTIONS: Record<"CLIENT" | "AGENCY", { value: string; label: string }[]> = {
  CLIENT: [
    { value: "CLIENT_MANAGER", label: "Hiring manager" },
    { value: "CLIENT_ADMIN", label: "Admin" },
  ],
  AGENCY: [
    { value: "AGENCY_RECRUITER", label: "Recruiter" },
    { value: "AGENCY_ADMIN", label: "Admin" },
  ],
};

export function InviteForm({ orgKind }: { orgKind: "CLIENT" | "AGENCY" }) {
  const [result, formAction, isPending] = useActionState(createInviteAction, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border bg-white p-5 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="text-sm font-medium text-ink">Email</label>
        <input name="email" type="email" required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Role</label>
        <select name="role" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm">
          {ROLE_OPTIONS[orgKind].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send invite"}
      </button>
      {result && result !== "SUCCESS" && <p className="text-sm text-status-red sm:basis-full">{result}</p>}
      {result === "SUCCESS" && <p className="text-sm text-status-green sm:basis-full">Invite sent.</p>}
    </form>
  );
}
