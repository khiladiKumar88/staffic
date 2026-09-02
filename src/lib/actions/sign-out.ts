"use server";

import { signOut } from "@/auth";

/**
 * Server Action for signing out — used as a <form action={signOutAction}>
 * target from client components. This is more robust than calling the
 * client-side `signOut()` from "next-auth/react" via an onClick handler:
 * it's a real form submission handled entirely server-side, so it can't be
 * silently swallowed by a client-side event-handling bug (stale hydration,
 * an overlapping element intercepting the click, an extension blocking the
 * fetch, etc.) — the browser's native form submission always fires.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
