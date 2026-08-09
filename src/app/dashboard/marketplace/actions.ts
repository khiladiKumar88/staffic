"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createSubmission } from "@/lib/services/submissions";

const submissionSchema = z.object({
  requisitionId: z.string().min(1),
  candidateId: z.string().min(1, "Select a candidate"),
  proposedRate: z.coerce.number().positive("Must be a positive number"),
});

export async function submitCandidateAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = submissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await createSubmission(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/marketplace");
  revalidatePath("/dashboard/submissions");
  return undefined;
}
