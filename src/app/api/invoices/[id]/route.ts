import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-utils";
import { sendInvoice, markInvoicePaid } from "@/lib/services/invoices";

const patchSchema = z.object({ action: z.enum(["send", "mark_paid"]) });

// PATCH /api/invoices/:id — { action: "send" } (agency, DRAFT -> SENT) or
// { action: "mark_paid" } (client, SENT -> PAID).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const invoice =
      parsed.data.action === "send"
        ? await sendInvoice(session.user, id)
        : await markInvoicePaid(session.user, id);
    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
