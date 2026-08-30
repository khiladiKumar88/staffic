"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "./actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [errorMessage, formAction, isPending] = useActionState(acceptInviteAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="text-sm font-medium text-ink">Email</label>
        <input
          value={email}
          disabled
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted"
        />
      </div>
      <div>
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Your name
        </label>
        <input id="name" name="name" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted">Min 12 chars, with uppercase, lowercase, digit, and special character.</p>
      </div>
      {errorMessage && <p className="text-sm text-status-red">{errorMessage}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "Joining…" : "Join team"}
      </button>
    </form>
  );
}
