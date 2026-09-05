import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-md border border-border bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-ink">Create your Staffic account</h1>
        <p className="mb-6 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
