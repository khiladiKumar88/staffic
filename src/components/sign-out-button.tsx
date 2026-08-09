import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button type="submit" className="text-sm font-medium text-muted hover:text-ink">
        Sign out
      </button>
    </form>
  );
}
