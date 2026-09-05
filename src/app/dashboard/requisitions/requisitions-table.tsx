"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export interface RequisitionRow {
  id: string;
  title: string;
  specialty: string;
  location: string;
  status: string;
  rateMin: string;
  rateMax: string;
  createdAt: string;
  _count: { submissions: number };
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "Status: All" },
  { value: "OPEN", label: "Open" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "FILLED", label: "Filled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "DRAFT", label: "Draft" },
];

/**
 * Client-side search/status filter over an already-fetched list — no URL
 * state, no server round trip. Fine at demo/pilot data volumes (see
 * docs/DECISIONS.md's note on reports doing the same thing); revisit with
 * server-side filtering if a client ever has thousands of requisitions.
 */
export function RequisitionsTable({ requisitions }: { requisitions: RequisitionRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requisitions.filter((r) => {
      const matchesQuery = q === "" || r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
      const matchesStatus = status === "ALL" || r.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [requisitions, query, status]);

  const hasFilters = query !== "" || status !== "ALL";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search requisitions…"
          className="min-w-[220px] flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("ALL");
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {requisitions.length === 0 ? "No requisitions yet — post one below." : "No requisitions match your filters."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">Posted</th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">Subs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-hover">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/requisitions/${r.id}`} className="font-medium text-ink hover:text-primary">
                      {r.title}
                    </Link>
                    <p className="text-xs text-muted">{r.specialty.replaceAll("_", " ")}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">{r.location}</td>
                  <td className="px-4 py-3 text-ink">
                    ${r.rateMin}–${r.rateMax}/hr
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(r.createdAt).toLocaleDateString("en-US")}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/requisitions/${r.id}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {r._count.submissions}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
