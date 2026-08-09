import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isClientRole } from "@/lib/rbac";
import { listRequisitionsForOrg } from "@/lib/services/requisitions";
import { NewRequisitionForm } from "./new-requisition-form";
import { RequisitionsTable } from "./requisitions-table";
import { buttonClasses } from "@/components/ui/Button";

export default async function RequisitionsPage() {
  const session = await auth();
  const user = session!.user;
  if (!isClientRole(user)) redirect("/dashboard");

  const requisitions = await listRequisitionsForOrg(user);
  const openCount = requisitions.filter((r) => r.status === "OPEN").length;

  const rows = requisitions.map((r) => ({
    id: r.id,
    title: r.title,
    specialty: r.specialty,
    location: r.location,
    status: r.status,
    rateMin: r.rateMin.toString(),
    rateMax: r.rateMax.toString(),
    createdAt: r.createdAt.toISOString(),
    _count: r._count,
  }));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Requisitions</h1>
          <p className="mt-1 text-sm text-muted">
            {requisitions.length} total · {openCount} open
          </p>
        </div>
        <Link href="#new-requisition" className={buttonClasses("primary")}>
          + New requisition
        </Link>
      </div>

      <RequisitionsTable requisitions={rows} />

      <div id="new-requisition">
        <h2 className="mb-4 text-lg font-semibold text-ink">Post a new requisition</h2>
        <NewRequisitionForm />
      </div>
    </div>
  );
}
