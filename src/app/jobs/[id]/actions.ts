"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { ForbiddenError } from "@/lib/rbac";
import { submitJobApplication } from "@/lib/services/directHire";

const applySchema = z.object({
  jobId: z.string().min(1),
  applicantName: z.string().min(2, "Name is too short"),
  applicantEmail: z.string().email("Enter a valid email"),
  applicantPhone: z.string().optional(),
  coverNote: z.string().optional(),
});

export async function applyToJobAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = applySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  // Honeypot field — see the comment above submitJobApplication in
  // directHire.ts. Real users never see or fill this in.
  const honeypot = formData.get("website");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await submitJobApplication({
      ...parsed.data,
      honeypot: typeof honeypot === "string" ? honeypot : undefined,
      ipAddress,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  return "SUCCESS";
}
