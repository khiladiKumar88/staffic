import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInviteByToken } from "@/lib/services/invites";
import { AcceptInviteForm } from "./accept-form";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-md border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-ink">Invite not found</h1>
          <p className="text-sm text-muted">
            This invite link is invalid, expired, or has already been used. Ask whoever invited you to send a new
            one.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-ink underline">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-md border border-border bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-ink">Join {invite.organization.name}</h1>
        <p className="mb-6 text-sm text-muted">
          You&apos;ve been invited as <strong>{invite.email}</strong>. Set a name and password to finish joining.
        </p>
        <AcceptInviteForm token={token} email={invite.email} />
      </div>
    </div>
  );
}
