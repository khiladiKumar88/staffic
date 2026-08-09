/**
 * Status pill, colored per the "Staffic style guide" mockup's 4-color
 * status system (blue/green/amber/red) plus a gray fallback for terminal/
 * neutral states. One mapping covers every status enum in the app
 * (RequisitionStatus, SubmissionStatus, PlacementStatus, TimesheetStatus,
 * InvoiceStatus, ApprovalStatus, DirectHireJobStatus, JobApplicationStatus,
 * FloatPoolAssignmentStatus, FloatPoolWorkerStatus) so every badge in the
 * app looks consistent without each page inventing its own colors.
 */

type BadgeColor = "blue" | "green" | "amber" | "red" | "gray";

const STATUS_COLOR: Record<string, BadgeColor> = {
  // Requisition
  DRAFT: "gray",
  OPEN: "blue",
  ON_HOLD: "amber",
  FILLED: "green",
  CANCELLED: "red",
  // Submission
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  INTERVIEW_REQUESTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  WITHDRAWN: "gray",
  // Placement
  UPCOMING: "blue",
  ACTIVE: "green",
  COMPLETED: "gray",
  TERMINATED: "red",
  // Invoice
  SENT: "blue",
  PAID: "green",
  // Org approval
  PENDING: "amber",
  // Direct hire job
  CLOSED: "gray",
  // Job application
  APPLIED: "blue",
  INTERVIEWING: "amber",
  OFFERED: "green",
  HIRED: "green",
  // Float pool
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${COLOR_CLASSES[color]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label ?? formatLabel(status)}
    </span>
  );
}
