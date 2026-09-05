import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md border border-border bg-white p-5 transition-shadow duration-200 hover:shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
