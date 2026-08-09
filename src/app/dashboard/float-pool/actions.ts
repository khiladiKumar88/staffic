"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createFloatPoolWorker, createFloatPoolAssignment, updateFloatPoolAssignmentStatus } from "@/lib/services/floatPool";

const workerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  specialty: z.enum(["LOCUM_TENENS", "NURSING", "ALLIED_HEALTH", "NON_CLINICAL"]),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  credentials: z.string().optional(),
});

export async function createWorkerAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = workerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const credentials = (parsed.data.credentials ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  try {
    await createFloatPoolWorker(session.user, {
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      credentials,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/float-pool");
  return undefined;
}

const assignmentSchema = z.object({
  workerId: z.string().min(1, "Select a worker"),
  unit: z.string().min(1, "Unit is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().optional(),
});

export async function createAssignmentAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await createFloatPoolAssignment(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/float-pool");
  return undefined;
}

export async function updateAssignmentStatusAction(
  assignmentId: string,
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateFloatPoolAssignmentStatus(session.user, assignmentId, status);
  revalidatePath("/dashboard/float-pool");
}
