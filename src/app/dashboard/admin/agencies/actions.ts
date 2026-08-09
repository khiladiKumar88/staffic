"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { decideAgencyApproval } from "@/lib/services/organizations";

export async function decideAgencyApprovalAction(organizationId: string, approved: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await decideAgencyApproval(session.user, organizationId, approved);
  revalidatePath("/dashboard/admin/agencies");
}
