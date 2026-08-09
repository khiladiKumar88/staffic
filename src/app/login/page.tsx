import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid flex-1 md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary px-12 py-16 text-white md:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-base font-bold">
            S
          </div>
          <span className="text-lg font-bold">Staffic</span>
        </div>
        <div>
          <h1 className="text-3xl leading-tight font-bold">
            Connecting hospitals with the staffing agencies that keep them running.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            One place to post requisitions, review candidate submissions, and track placements — for facilities and
            agencies alike.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Staffic, Inc.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-ink">Welcome back</h2>
          <p className="mb-8 text-sm text-muted">Sign in to your Staffic account</p>
          <LoginForm />
          <p className="mt-6 text-sm text-muted">
            Use a seeded demo account — see <code className="rounded bg-hover px-1 py-0.5 text-xs">README.md</code>{" "}
            — or{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              create an account
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
