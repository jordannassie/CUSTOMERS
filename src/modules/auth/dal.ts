import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { loginPathFor } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { AuthError } from "./errors";
import { PAUSED_PATH, isAdminEmail, isAgencyPaused, parseAdminEmails } from "./service";

export type SessionUser = { id: string; email: string | null };
export type CurrentAgency = { id: string; name: string; status: string; isTest: boolean };

// Pages pass `next` (the path to come back to) and get redirects; actions and routes omit it
// and get an AuthError to turn into a 401 or 403.
export type GuardOptions = { next?: string };

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

export const getCurrentAgency = cache(async (): Promise<CurrentAgency | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, status, is_test")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load agency: ${error.message}`);
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
    if (options.next !== undefined) redirect(PAUSED_PATH);
    throw new AuthError("agency_paused");
  }
  return { user, agency };
}

export async function requireAdmin(options: GuardOptions = {}): Promise<SessionUser> {
  const user = await requireUser(options);
  if (isAdmin(user)) return user;
  if (options.next !== undefined) redirect("/dashboard");
  throw new AuthError("forbidden");
}

// For showing admin-only links; access checks still go through requireAdmin().
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && isAdmin(user);
}

// Only ADMIN_EMAILS is trusted; profile fields are not an admin source.
function isAdmin(user: SessionUser): boolean {
  return isAdminEmail(user.email, parseAdminEmails(env.ADMIN_EMAILS));
}
