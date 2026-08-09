"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

/**
 * Avatar + name/role + dropdown chevron, matching the mockup's header
 * exactly. The mockup's chevron implies a dropdown menu, so this is a real
 * dropdown (not just decoration) — its one real action is Sign out, the
 * same action the old plain-text "Sign out" link performed.
 */
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
        className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-hover"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary">
          {initials}
        </div>
        <div className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-[13px] font-semibold whitespace-nowrap text-ink">{name}</span>
          <span className="text-[11.5px] text-muted">{role}</span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-ink hover:bg-hover"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
