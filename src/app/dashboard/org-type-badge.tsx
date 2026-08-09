/**
 * Visually the same two-pill control as the mockup's "Hospital / Agency"
 * switcher, but it isn't a functional toggle — an account's org type
 * (client hospital vs. staffing agency) is fixed at signup, there's no
 * feature to switch views. So this renders both labels with the account's
 * real type highlighted and the other one inert (not a button, not
 * clickable) rather than faking a switch that would do nothing.
 */
export function OrgTypeBadge({ type }: { type: "CLIENT" | "AGENCY" }) {
  return (
    <div className="hidden items-center rounded-lg border border-border bg-white p-0.5 md:flex">
      <span
        className={`rounded-md px-3 py-1 text-[13px] font-medium ${
          type === "CLIENT" ? "bg-ink text-white" : "text-muted"
        }`}
      >
        Hospital
      </span>
      <span
        className={`rounded-md px-3 py-1 text-[13px] font-medium ${
          type === "AGENCY" ? "bg-ink text-white" : "text-muted"
        }`}
      >
        Agency
      </span>
    </div>
  );
}
