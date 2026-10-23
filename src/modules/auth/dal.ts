import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { loginPathFor } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { AuthError } from "./errors";
import { isAuthUnavailable } from "@/lib/supabase/auth-errors";
import { blockedPathFor, isAdminEmail, isAgencyPaused, isRecentRecovery, parseAdminEmails } from "./service";

export type SessionUser = { id: string; email: string | null };
export type CurrentAgency = { id: string; name: string; status: string; isTest: boolean };

// Pages pass `next` (the path to come back to) and get redirects; actions and routes omit it
// and get an AuthError to turn into a 401 or 403. When the check itself fails (a slow or down backend),
// every caller gets AuthError "unavailable" (503): pages show their error boundary, never the login page.
export type GuardOptions = { next?: string };

type VerifiedUser = { user: SessionUser; emailConfirmed: boolean };

// One getUser() per request. The confirmed flag stays here so SessionUser keeps only what screens need.
const loadUser = cache(async (): Promise<VerifiedUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && isAuthUnavailable(error)) throw new AuthError("unavailable", { cause: error });
  if (error || !data.user) return null;
  return {
    user: { id: data.user.id, email: data.user.email ?? null },
    emailConfirmed: !!data.user.email_confirmed_at,
  };
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => (await loadUser())?.user ?? null);

export const getCurrentAgency = cache(async (): Promise<CurrentAgency | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, status, is_test")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (error) throw new AuthError("unavailable", { cause: new Error(`Could not load agency: ${error.message}`) });
  return data && { id: data.id, name: data.name, status: data.status, isTest: data.is_test };
});

export async function requireUser(options: GuardOptions = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user) return user;
  if (options.next !== undefined) redirect(loginPathFor(options.next));
  throw new AuthError("not_signed_in");
}

export async function requireAgency(
  options: GuardOptions = {},
): Promise<{ user: SessionUser; agency: CurrentAgency }> {
  const user = await requireUser(options);
  const agency = await getCurrentAgency();
  if (!agency) throw new AuthError("no_agency");
  if (isAgencyPaused(agency.status)) {
    if (options.next !== undefined) redirect(blockedPathFor(agency.status));
    throw new AuthError(agency.status === "deleted" ? "agency_deleted" : "agency_paused");
  }
  return { user, agency };
}

export async function requireAdmin(options: GuardOptions = {}): Promise<SessionUser> {
  const user = await requireUser(options);
  if (await isAdmin(user)) return user;
  if (options.next !== undefined) redirect("/dashboard");
  throw new AuthError("forbidden");
}

// For showing admin-only links; access checks still go through requireAdmin().
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && (await isAdmin(user));
}

/**
 * Whether this session came from a password reset link opened in the last hour (its amr claim). The reset page
 * shows its form only then, so a signed-in session cannot set a new password there without the old one.
 */
export async function hasRecentRecoverySession(now?: Date): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error && isAuthUnavailable(error)) throw new AuthError("unavailable", { cause: error });
  if (error || !data?.claims) return false;
  // The clock is read only after the session: Next.js refuses `new Date()` before a request value when prerendering.
  return isRecentRecovery(data.claims.amr, Math.floor((now ?? new Date()).getTime() / 1000));
}

/** Where admin-only emails go, such as system alerts (B-69). */
export function adminEmails(): string[] {
  return parseAdminEmails(env.ADMIN_EMAILS);
}

// Only ADMIN_EMAILS is trusted, and only for a confirmed address: anyone can sign up with an
// admin's address before the real owner does. Profile fields are not an admin source.
async function isAdmin(user: SessionUser): Promise<boolean> {
  const verified = await loadUser();
  const confirmed = !!verified && verified.user.id === user.id && verified.emailConfirmed;
  return isAdminEmail(user.email, parseAdminEmails(env.ADMIN_EMAILS), confirmed);
}
