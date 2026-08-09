"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createRequisition } from "@/lib/services/requisitions";
import { updateSubmissionStatus } from "@/lib/services/submissions";
import { createPlacement } from "@/lib/services/placements";

const requisitionSchema = z.object({
  title: z.string().min(3, "Title is too short"),
  specialty: z.enum(["LOCUM_TENENS", "NURSING", "ALLIED_HEALTH", "NON_CLINICAL"]),
  location: z.string().min(1, "Location is required"),
  rateMin: z.coerce.number().positive("Must be a positive number"),
  rateMax: z.coerce.number().positive("Must be a positive number"),
  description: z.string().optional(),
});

export async function createRequisitionAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = requisitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }
  if (parsed.data.rateMax < parsed.data.rateMin) {
    return "Max rate must be greater than or equal to min rate.";
  }

  try {
    await createRequisition(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/requisitions");
  return undefined;
}

export async function updateSubmissionStatusAction(submissionId: string, status: "UNDER_REVIEW" | "INTERVIEW_REQUESTED" | "APPROVED" | "REJECTED") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateSubmissionStatus(session.user, submissionId, status);
  revalidatePath("/dashboard/requisitions");
}

const placementSchema = z.object({
  submissionId: z.string().min(1),
  startDate: z.coerce.date(),
  actualRate: z.coerce.number().positive(),
});

export async function createPlacementAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await createPlacement(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/requisitions");
  return undefined;
}
