"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { createInvite, revokeInvite } from "@/lib/services/invites";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["CLIENT_ADMIN", "CLIENT_MANAGER", "AGENCY_ADMIN", "AGENCY_RECRUITER"]),
});

export async function createInviteAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await createInvite(session.user, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  revalidatePath("/dashboard/team");
  return "SUCCESS";
}

export async function revokeInviteAction(inviteId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await revokeInvite(session.user, inviteId);
  revalidatePath("/dashboard/team");
}
