import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { generateInvoice, listInvoicesForOrg } from "@/lib/services/invoices";

const generateInvoiceSchema = z.object({ placementId: z.string().min(1) });

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await listInvoicesForOrg(session.user);
    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

// POST /api/invoices — agency bundles a placement's approved, unbilled
// timesheets into a new DRAFT invoice.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = generateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const invoice = await generateInvoice(session.user, parsed.data.placementId);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
