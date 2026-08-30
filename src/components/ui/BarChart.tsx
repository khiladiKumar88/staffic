"use client";

/**
 * Polished CSS bar chart with hover tooltips and gradient bars.
 * No charting library needed for simple count-per-month visualization.
 */
export function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-44 items-end gap-3">
      {data.map((d) => {
        const pct = Math.max(6, Math.round((d.count / max) * 100));
        return (
          <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-semibold text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {d.count}
            </span>
            <div className="flex w-full flex-1 items-end justify-center px-0.5">
              <div
                className="bar-chart-bar w-full rounded-t-lg transition-all duration-300 ease-out group-hover:opacity-90"
                style={{
                  height: `${pct}%`,
                  background: "linear-gradient(to top, #0b5a52, #0f6e64, #14917e)",
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
