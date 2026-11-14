import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { BillingStatus } from "../service";

// One agency's state and the writes admin actions make to it, split from the list (../dal.ts) to keep both short.
// Callers (actions.ts) run requireAdmin() and validate input first.

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin agencies: could not ${what}: ${error.message}`);
}

export type AgencyState = {
  status: string;
  isTest: boolean;
  trialEndsAt: string | null;
  subscriptionId: string | null;
  deletedAt: string | null;
  purgeAfter: string | null;
  ownerUserId: string;
};

export async function readAgencyState(agencyId: string): Promise<AgencyState | null> {
  const { data, error } = await createServiceClient()
    .from("agencies")
    .select("status, is_test, trial_ends_at, stripe_subscription_id, deleted_at, purge_after, owner_user_id")
    .eq("id", agencyId)
    .maybeSingle();
  if (error) fail("load the agency", error);
  if (!data) return null;
  return {
    status: data.status,
    isTest: data.is_test,
    trialEndsAt: data.trial_ends_at,
    subscriptionId: data.stripe_subscription_id,
    deletedAt: data.deleted_at,
    purgeAfter: data.purge_after,
    ownerUserId: data.owner_user_id,
  };
}

/** Changes status only if it is still `from`, so two admins acting at once cannot both win. */
export async function changeStatus(
  agencyId: string,
  from: string,
  to: BillingStatus | "suspended",
  clearDeletedAt = false,
): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("agencies")
    .update(clearDeletedAt ? { status: to, deleted_at: null, purge_after: null } : { status: to })
    .eq("id", agencyId)
    .eq("status", from)
    .select("id");
  if (error) fail("change the status", error);
  return data.length === 1;
}

export async function setTestFlag(agencyId: string, isTest: boolean): Promise<void> {
  const { error } = await createServiceClient().from("agencies").update({ is_test: isTest }).eq("id", agencyId);
  if (error) fail("change the test flag", error);
}

/** The Stripe webhook saves the same value when Stripe confirms; this shows it at once. */
export async function setTrialEnd(agencyId: string, trialEnd: Date): Promise<void> {
  const { error } = await createServiceClient()
    .from("agencies")
    .update({ trial_ends_at: trialEnd.toISOString() })
    .eq("id", agencyId);
  if (error) fail("save the trial end", error);
}

/** The owner's sign-in email, for the email an admin action sends them. */
export async function ownerEmail(ownerUserId: string): Promise<string | null> {
  const { data, error } = await createServiceClient().auth.admin.getUserById(ownerUserId);
  if (error) fail("load the owner", error);
  return data.user?.email ?? null;
}

/** The status recorded by the latest suspend that did not fail (BUG-278), so unsuspend can put it back. */
export async function statusBeforeSuspend(agencyId: string): Promise<unknown> {
  const { data, error } = await createServiceClient()
    .from("admin_audit_log")
    .select("details")
    .eq("target_type", "agency")
    .eq("target_id", agencyId)
    .eq("action", "agency.suspend")
    // A 'started' row may have changed the status, so it counts; a 'failed' one did not.
    .neq("outcome", "failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("read the last suspend", error);
  const details = data?.details;
  return details && typeof details === "object" && !Array.isArray(details) ? details.previous_status : undefined;
}
