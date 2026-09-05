import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isClientRole, isAgencyRole } from "@/lib/rbac";
import { listInvoicesForOrg } from "@/lib/services/invoices";
import { listPlacementsForAgency } from "@/lib/services/placements";
import { GenerateInvoiceForm } from "./generate-invoice-form";
import { sendInvoiceAction, markInvoicePaidAction } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-hover text-ink",
  SENT: "bg-status-amber-tint text-status-amber",
  PAID: "bg-status-green-tint text-status-green",
};

export default async function InvoicesPage() {
  const session = await auth();
  const user = session!.user;
  if (!isClientRole(user) && !isAgencyRole(user)) redirect("/dashboard");

  const invoices = await listInvoicesForOrg(user);
  const placements = isAgencyRole(user) ? await listPlacementsForAgency(user) : [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-ink">Invoices</h1>
      <p className="-mt-6 text-sm text-muted">
        A billing record, not a payment processor — sending and marking paid are manual steps that mirror
        whatever you actually do outside Staffic (your AP process, bank transfer, payroll provider, etc.).
      </p>

      {isAgencyRole(user) && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">Generate an invoice</h2>
          <GenerateInvoiceForm
            placements={placements.map((p) => ({
              id: p.id,
              label: `${p.submission.candidate.name} — ${p.submission.requisition.title}`,
            }))}
          />
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">All invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">No invoices yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-white">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-ink">{inv.placement.submission.requisition.title}</p>
                  <p className="text-sm text-muted">
                    {inv.agencyOrg.name} → {inv.clientOrg.name} · {inv.totalHours.toString()} hrs · $
                    {inv.totalAmount.toString()} · {new Date(inv.periodStart).toLocaleDateString("en-US")}–
                    {new Date(inv.periodEnd).toLocaleDateString("en-US")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                    {inv.status}
                  </span>
                  {isAgencyRole(user) && inv.status === "DRAFT" && (
                    <form action={sendInvoiceAction.bind(null, inv.id)}>
                      <button className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface">
                        Send
                      </button>
                    </form>
                  )}
                  {isClientRole(user) && inv.status === "SENT" && (
                    <form action={markInvoicePaidAction.bind(null, inv.id)}>
                      <button className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface">
                        Mark paid
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
