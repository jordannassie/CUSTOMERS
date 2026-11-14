import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { loginPathFor } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { adminEmailConfirmed } from "./admin-email/dal";
import { AuthError } from "./errors";
import { isAuthUnavailable } from "@/lib/supabase/auth-errors";
import { adminVerifyPathFor, blockedPathFor, isAdminEmail, isAgencyPaused, isRecentRecovery, needsSecondFactor, parseAdminEmails } from "./service";

export type SessionUser = { id: string; email: string | null };
export type CurrentAgency = { id: string; name: string; status: string; isTest: boolean };

// Pages pass `next` (the path to come back to) and get redirects; actions and routes omit it
// and get an AuthError to turn into a 401 or 403. When the check itself fails (a slow or down backend),
// every caller gets AuthError "unavailable" (503): pages show their error boundary, never the login page.
export type GuardOptions = { next?: string };

// The full user from Supabase Auth (a network call), only for a signed-in user with no agency (getCurrentUser: a new
// sign-up or a deleted account). The admin check asks admin-email/dal.ts instead.
const loadUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && isAuthUnavailable(error)) throw new AuthError("unavailable", { cause: error });
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

// The signed-in user from the session token. getClaims() checks its signature locally against the project's published
// key (cached), like proxy.ts, instead of a round trip to Supabase Auth on every page and action.
const sessionClaims = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error && isAuthUnavailable(error)) throw new AuthError("unavailable", { cause: error });
  return error ? null : (data?.claims ?? null);
});

const claimsUser = cache(async (): Promise<SessionUser | null> => {
  const claims = await sessionClaims();
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" && claims.email ? claims.email : null };
});

type AgencyRow = { id: string; name: string; status: string; is_test: boolean };

const agencyOf = cache(async (userId: string): Promise<AgencyRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("agencies").select("id, name, status, is_test").eq("owner_user_id", userId).maybeSingle();
  if (error) throw new AuthError("unavailable", { cause: new Error(`Could not load agency: ${error.message}`) });
  return data;
});

/**
 * Every page and action asks this first. A token outlives a deleted account (its agency goes with it, ON DELETE
 * CASCADE), so a user with no agency, a new sign-up or a deleted account, is checked with Supabase Auth too and a
 * deleted one is signed out (BUG-020). Everyone else costs only the agency read the pages make anyway.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const user = await claimsUser();
  if (!user) return null;
  if (await agencyOf(user.id)) return user;
  const verified = await loadUser();
  return verified && verified.id === user.id ? user : null;
});

export const getCurrentAgency = cache(async (): Promise<CurrentAgency | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await agencyOf(user.id);
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
  const user = await requireAdminPassword(options);
  // With ADMIN_REQUIRE_MFA on, a password alone is not enough: the session must have passed the app code (aal2).
  if (!(await adminNeedsSecondFactor())) return user;
  if (options.next !== undefined) redirect(adminVerifyPathFor(options.next));
  throw new AuthError("second_factor");
}

/** An admin by email who may not have entered the app code yet: only for the page and actions that ask for it. */
export async function requireAdminPassword(options: GuardOptions = {}): Promise<SessionUser> {
  const user = await requireUser(options);
  if (await isAdmin(user)) return user;
  if (options.next !== undefined) redirect("/dashboard");
  throw new AuthError("forbidden");
}

/** Whether this session still has to enter the authenticator app code (always false with ADMIN_REQUIRE_MFA off). */
export async function adminNeedsSecondFactor(): Promise<boolean> {
  return needsSecondFactor(env.ADMIN_REQUIRE_MFA === "true", (await sessionClaims())?.aal);
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
// admin's address before the real owner does. Profile fields are not an admin source. The address comes from the
// signature-checked session token; whether it is confirmed is asked of Supabase Auth by user id and kept for a few
// minutes (admin-email/dal.ts), instead of an Auth round trip on every admin request (perf fix #4, 2026-11-13).
async function isAdmin(user: SessionUser): Promise<boolean> {
  const admins = parseAdminEmails(env.ADMIN_EMAILS);
  // Most users are not on the list, so Supabase Auth is only asked about an address that is.
  if (!user.email || !isAdminEmail(user.email, admins, true)) return false;
  return isAdminEmail(user.email, admins, await adminEmailConfirmed(user.id, user.email));
}
