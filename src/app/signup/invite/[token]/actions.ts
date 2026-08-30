"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { acceptInvite, getInviteByToken } from "@/lib/services/invites";
import { passwordSchema } from "@/lib/password";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2, "Your name is too short"),
  password: passwordSchema,
});

export async function acceptInviteAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const invite = await getInviteByToken(parsed.data.token);
  if (!invite) {
    return "This invite is invalid, expired, or has already been used.";
  }

  try {
    await acceptInvite(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  try {
    await signIn("credentials", {
      email: invite.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created but auto-login failed for some reason — send
      // them to log in manually rather than losing the account entirely.
      return "Account created — please sign in.";
    }
    throw error;
  }
}
