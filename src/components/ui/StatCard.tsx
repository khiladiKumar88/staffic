import type { ReactNode } from "react";

const TONE_ICON: Record<string, { bg: string; color: string; path: string }> = {
  good: {
    bg: "bg-status-green-tint",
    color: "text-status-green",
    path: "M5 12l5 5L20 7",
  },
  caution: {
    bg: "bg-status-amber-tint",
    color: "text-status-amber",
    path: "M12 9v4m0 4h.01M12 2L2 20h20L12 2z",
  },
};

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: "good" | "caution" | "neutral";
  icon?: ReactNode;
}) {
  const deltaClass =
    deltaTone === "good"
      ? "text-status-green"
      : deltaTone === "caution"
        ? "text-status-amber"
        : "text-muted";

  const toneIcon = deltaTone !== "neutral" ? TONE_ICON[deltaTone] : null;

  return (
    <div className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium tracking-wide text-muted">{label}</span>
        {icon ??
          (toneIcon && (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneIcon.bg}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={toneIcon.color}
              >
                <path d={toneIcon.path} />
              </svg>
            </div>
          ))}
      </div>
      <span className="mt-3 block text-3xl font-bold tracking-tight text-ink">{value}</span>
      {delta && (
        <span className={`mt-1.5 block text-xs font-medium ${deltaClass}`}>{delta}</span>
      )}
    </div>
  );
}
