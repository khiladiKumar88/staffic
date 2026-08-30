"use client";

import { useActionState, useState } from "react";
import { signupAction } from "./actions";

export function SignupForm() {
  const [errorMessage, formAction, isPending] = useActionState(signupAction, undefined);
  const [orgType, setOrgType] = useState<"CLIENT" | "AGENCY">("CLIENT");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">I'm signing up as a...</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrgType("CLIENT")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${orgType === "CLIENT" ? "border-primary bg-primary text-white" : "border-border text-ink"}`}
          >
            Hospital / health system
          </button>
          <button
            type="button"
            onClick={() => setOrgType("AGENCY")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${orgType === "AGENCY" ? "border-primary bg-primary text-white" : "border-border text-ink"}`}
          >
            Staffing agency
          </button>
        </div>
        <input type="hidden" name="orgType" value={orgType} />
        {orgType === "AGENCY" && (
          <p className="mt-2 text-xs text-muted">
            Agency accounts require a quick review before you can access the marketplace.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="orgName" className="text-sm font-medium text-ink">
          {orgType === "CLIENT" ? "Hospital / system name" : "Agency name"}
        </label>
        <input id="orgName" name="orgName" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="userName" className="text-sm font-medium text-ink">
          Your name
        </label>
        <input id="userName" name="userName" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="userEmail" className="text-sm font-medium text-ink">
          Email
        </label>
        <input id="userEmail" name="userEmail" type="email" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="userPassword" className="text-sm font-medium text-ink">
          Password
        </label>
        <input id="userPassword" name="userPassword" type="password" required minLength={12} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        <p className="mt-1 text-xs text-muted">Min 12 chars, with uppercase, lowercase, digit, and special character.</p>
      </div>

      {errorMessage && <p className="text-sm text-status-red">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
