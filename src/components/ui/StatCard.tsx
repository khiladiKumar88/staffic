import type { ReactNode } from "react";
import { Card } from "./Card";

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
    deltaTone === "good" ? "text-status-green" : deltaTone === "caution" ? "text-status-amber" : "text-muted";

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold text-ink">{value}</span>
      {delta && <span className={`text-xs font-medium ${deltaClass}`}>{delta}</span>}
    </Card>
  );
}
