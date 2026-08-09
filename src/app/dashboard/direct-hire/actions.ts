"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createDirectHireJob, updateDirectHireJobStatus, updateJobApplicationStatus } from "@/lib/services/directHire";

const jobSchema = z.object({
  title: z.string().min(3, "Title is too short"),
  specialty: z.enum(["LOCUM_TENENS", "NURSING", "ALLIED_HEALTH", "NON_CLINICAL"]),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  salaryMin: z.coerce.number().positive().optional(),
  salaryMax: z.coerce.number().positive().optional(),
});

export async function createJobAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const raw = Object.fromEntries(formData);
  const parsed = jobSchema.safeParse({
    ...raw,
    salaryMin: raw.salaryMin || undefined,
    salaryMax: raw.salaryMax || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await createDirectHireJob(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/direct-hire");
  return undefined;
}

export async function updateJobStatusAction(jobId: string, status: "OPEN" | "CLOSED" | "FILLED") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateDirectHireJobStatus(session.user, jobId, status);
  revalidatePath("/dashboard/direct-hire");
  revalidatePath(`/dashboard/direct-hire/${jobId}`);
}

export async function updateApplicationStatusAction(
  applicationId: string,
  status: "UNDER_REVIEW" | "INTERVIEWING" | "OFFERED" | "HIRED" | "REJECTED",
  jobId: string,
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateJobApplicationStatus(session.user, applicationId, status);
  revalidatePath(`/dashboard/direct-hire/${jobId}`);
}
