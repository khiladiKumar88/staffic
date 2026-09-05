"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[13.5px] font-medium whitespace-nowrap transition-colors ${
              isActive ? "bg-primary-tint font-semibold text-primary" : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
