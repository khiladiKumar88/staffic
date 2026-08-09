/**
 * Minimal CSS bar chart — no charting library dependency for one simple
 * "count per month" visualization. Bars scale relative to the max value in
 * the series; a series of all zeros still renders flat, visible bars
 * rather than collapsing to nothing.
 */
export function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-40 items-end gap-4">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-medium text-ink">{d.count}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary"
              style={{ height: `${Math.max(4, Math.round((d.count / max) * 100))}%` }}
            />
          </div>
          <span className="text-xs text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
