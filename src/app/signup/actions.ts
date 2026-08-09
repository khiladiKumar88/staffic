"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { ForbiddenError } from "@/lib/rbac";
import { registerOrganization } from "@/lib/services/organizations";

const signupSchema = z.object({
  orgType: z.enum(["CLIENT", "AGENCY"]),
  orgName: z.string().min(2, "Organization name is too short"),
  userName: z.string().min(2, "Your name is too short"),
  userEmail: z.string().email("Enter a valid email"),
  userPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signupAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  try {
    await registerOrganization(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return error.message;
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.userEmail,
      password: parsed.data.userPassword,
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
