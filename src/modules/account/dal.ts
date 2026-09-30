import "server-only";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentAgency, requireUser, type GuardOptions } from "@/modules/auth";
import type { Database } from "@/types/database.types";

// Account reads and writes (B-77). Callers (actions.ts) check auth and validate input first; every write that
// touches the agency is scoped to the agency requireAgency() returned.

const LOGO_BUCKET = "business-logos";

function fail(what: string, error: { message: string }): never {
  throw new Error(`Account: could not ${what}: ${error.message}`);
}

export const deletionWaitDays = () => env.DELETION_WAIT_DAYS;

export type AccountView = {
  email: string | null;
  /** The new address while its confirmation link is waiting to be clicked. */
  pendingEmail: string | null;
  /** False when the account signs in only with Google. */
  hasPassword: boolean;
  agencyName: string | null;
  waitDays: number;
};

export async function getAccountView(options: GuardOptions = {}): Promise<AccountView> {
  await requireUser(options);
  const supabase = await createClient();
  const [{ data, error }, agency] = await Promise.all([supabase.auth.getUser(), getCurrentAgency()]);
  if (error || !data.user) fail("load your sign-in details", error ?? { message: "no user" });
  const providers = (data.user.identities ?? []).map((i) => i.provider);
  return {
    email: data.user.email ?? null,
    pendingEmail: data.user.new_email ?? null,
    hasPassword: providers.includes("email"),
    agencyName: agency?.name ?? null,
    waitDays: deletionWaitDays(),
  };
}

/** The signed-in user's providers, to know whether a current password must be checked. */
export async function hasPasswordSignIn(): Promise<boolean> {
  const { data, error } = await (await createClient()).auth.getUser();
  if (error || !data.user) fail("load your sign-in details", error ?? { message: "no user" });
  return (data.user.identities ?? []).some((i) => i.provider === "email");
}

/**
 * Checks a password without touching the browser session: a throwaway client signs in, then ends only that
 * session. Supabase rate limits sign-in attempts.
 */
export async function passwordMatches(email: string, password: string): Promise<boolean> {
  const client = createPlainClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}

async function origin(): Promise<string> {
  const configured = env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type AuthUpdate = { ok: true } | { ok: false; code: string | undefined; message: string };

/** Supabase emails a link to the new address (and the old one, with secure email change on); the change waits for it. */
export async function updateEmail(email: string): Promise<AuthUpdate> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await origin()}/auth/callback?next=/settings%23account` },
  );
  return error ? { ok: false, code: error.code, message: error.message } : { ok: true };
}

export async function updatePassword(password: string, nonce?: string): Promise<AuthUpdate> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(nonce ? { password, nonce } : { password });
  return error ? { ok: false, code: error.code, message: error.message } : { ok: true };
}

/** Emails a one-time code; Supabase asks for it before a password change when the sign-in is not recent. */
export async function sendReauthenticationCode(): Promise<AuthUpdate> {
  const { error } = await (await createClient()).auth.reauthenticate();
  return error ? { ok: false, code: error.code, message: error.message } : { ok: true };
}

/** Ends every session of the user, on every device. */
export async function signOutEverywhere(): Promise<void> {
  await (await createClient()).auth.signOut({ scope: "global" });
}

export type DeletableAgency = { name: string; subscriptionId: string | null; ownerUserId: string };

export async function readAgencyForDelete(agencyId: string): Promise<DeletableAgency> {
  const { data, error } = await createServiceClient()
    .from("agencies")
    .select("name, stripe_subscription_id, owner_user_id")
    .eq("id", agencyId)
    .single();
  if (error) fail("load the agency", error);
  return { name: data.name, subscriptionId: data.stripe_subscription_id, ownerUserId: data.owner_user_id };
}

/** The business's name when it belongs to this agency and is not deleted yet. */
export async function readBusinessName(agencyId: string, businessId: string): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) fail("load the business", error);
  return data?.name ?? null;
}

/** Status 'deleted', share links revoked, queued scans stopped, in one transaction (migration 042). */
export async function softDeleteAgency(agencyId: string, purgeAfter: Date): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("soft_delete_agency", {
    p_agency_id: agencyId,
    p_purge_after: purgeAfter.toISOString(),
  });
  if (error) fail("delete the account", error);
  return data;
}

export async function softDeleteBusiness(agencyId: string, businessId: string, purgeAfter: Date): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("soft_delete_business", {
    p_agency_id: agencyId,
    p_business_id: businessId,
    p_purge_after: purgeAfter.toISOString(),
  });
  if (error) fail("delete the business", error);
  return data;
}

// The purge job's follow-up (purge.ts). The service role only: there is no signed-in user.

export type PurgedAccount = { agencyId: string; ownerEmail: string | null; agencyName: string };

export async function listPurgedAccounts(): Promise<PurgedAccount[]> {
  const { data, error } = await createServiceClient()
    .from("account_purges")
    .select("agency_id, owner_email, agency_name")
    .order("purged_at")
    .limit(100);
  if (error) fail("list purged accounts", error);
  return data.map((r) => ({ agencyId: r.agency_id, ownerEmail: r.owner_email, agencyName: r.agency_name }));
}

/** Removes every file under the agency's logo folder. */
export async function removeAgencyFiles(agencyId: string): Promise<void> {
  const bucket = createServiceClient().storage.from(LOGO_BUCKET);
  const folder = `agencies/${agencyId}`;
  const { data, error } = await bucket.list(folder);
  if (error) fail("list the logo files", error);
  if (data.length === 0) return;
  const { error: removeError } = await bucket.remove(data.map((f) => `${folder}/${f.name}`));
  if (removeError) fail("remove the logo files", removeError);
}

export async function forgetPurgedAccount(agencyId: string): Promise<void> {
  const { error } = await createServiceClient().from("account_purges").delete().eq("agency_id", agencyId);
  if (error) fail("clear the purge note", error);
}
