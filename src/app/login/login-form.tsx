"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="you@hospital.org"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      {errorMessage && <p className="text-sm text-status-red">{errorMessage}</p>}

      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
