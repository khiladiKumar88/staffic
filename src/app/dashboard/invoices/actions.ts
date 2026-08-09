"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { generateInvoice, sendInvoice, markInvoicePaid } from "@/lib/services/invoices";

const generateSchema = z.object({ placementId: z.string().min(1, "Select a placement") });

export async function generateInvoiceAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = generateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await generateInvoice(session.user, parsed.data.placementId);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/invoices");
  return undefined;
}

export async function sendInvoiceAction(invoiceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await sendInvoice(session.user, invoiceId);
  revalidatePath("/dashboard/invoices");
}

export async function markInvoicePaidAction(invoiceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await markInvoicePaid(session.user, invoiceId);
  revalidatePath("/dashboard/invoices");
}
