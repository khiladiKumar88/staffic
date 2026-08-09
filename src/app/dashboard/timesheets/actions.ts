"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createTimesheet, reviewTimesheet } from "@/lib/services/timesheets";

const timesheetSchema = z.object({
  placementId: z.string().min(1, "Select a placement"),
  weekStartDate: z.coerce.date(),
  hoursWorked: z.coerce.number().positive("Must be a positive number").max(168, "That's more hours than a week has"),
  notes: z.string().optional(),
});

export async function createTimesheetAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = timesheetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await createTimesheet(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/timesheets");
  return undefined;
}

export async function reviewTimesheetAction(timesheetId: string, approved: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await reviewTimesheet(session.user, timesheetId, approved);
  revalidatePath("/dashboard/timesheets");
}
