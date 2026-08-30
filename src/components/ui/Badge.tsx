type BadgeColor = "blue" | "green" | "amber" | "red" | "gray";

const STATUS_COLOR: Record<string, BadgeColor> = {
  DRAFT: "gray",
  OPEN: "blue",
  ON_HOLD: "amber",
  FILLED: "green",
  CANCELLED: "red",
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  INTERVIEW_REQUESTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  WITHDRAWN: "gray",
  UPCOMING: "blue",
  ACTIVE: "green",
  COMPLETED: "gray",
  TERMINATED: "red",
  SENT: "blue",
  PAID: "green",
  PENDING: "amber",
  CLOSED: "gray",
  APPLIED: "blue",
  INTERVIEWING: "amber",
  OFFERED: "green",
  HIRED: "green",
  SCHEDULED: "blue",
  IN_PROGRESS: "amber",
  INACTIVE: "gray",
};

const COLOR_CLASSES: Record<BadgeColor, string> = {
  blue: "bg-status-blue-tint text-status-blue",
  green: "bg-status-green-tint text-status-green",
  amber: "bg-status-amber-tint text-status-amber",
  red: "bg-status-red-tint text-status-red",
  gray: "bg-status-gray-tint text-status-gray",
};

function formatLabel(status: string): string {
  const words = status.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase());
  return words.join(" ");
}

export function Badge({ status, label }: { status: string; label?: string }) {
  const color = STATUS_COLOR[status] ?? "gray";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${COLOR_CLASSES[color]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label ?? formatLabel(status)}
    </span>
  );
}
