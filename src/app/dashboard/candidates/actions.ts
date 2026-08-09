"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createCandidate } from "@/lib/services/candidates";

const candidateSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  credentials: z.string().optional(),
});

export async function createCandidateAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = candidateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const credentials = (parsed.data.credentials ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  try {
    await createCandidate(session.user, {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      credentials,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/candidates");
  return undefined;
}
