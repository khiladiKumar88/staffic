"use client";

import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/actions/sign-out";

export function UserMenu({ name, role, initials }: { name: string; role: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-hover transition-colors"
      >
        <div className="topbar__avatar">{initials}</div>
        <span className="topbar__user-name hidden sm:inline">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg">
          <div className="px-3 py-2 border-b border-border">
            <span className="block text-xs font-semibold text-ink">{name}</span>
            <span className="block text-[11px] text-muted mt-0.5">{role}</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-sm font-medium text-ink hover:bg-hover transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
