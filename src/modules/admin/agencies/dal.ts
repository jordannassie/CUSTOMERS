import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { allRows, emailsOf } from "../businesses/dal";
import type { AgencyFilter } from "./schema";
import { planMix, restoreDeadline, type BillingStatus } from "./service";

// Admin reads cross every agency, so they use the service role after requireAdmin().

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin agencies: could not ${what}: ${error.message}`);
}

export type AdminAgencyRow = {
  id: string;
  name: string;
  ownerEmail: string | null;
  status: string;
  isTest: boolean;
  businesses: number;
  planMix: string;
  credits: { plan: number; topup: number; overdraft: number };
  trialEndsAt: string | null;
  stripeLinked: boolean;
  createdAt: string;
  restoreUntil: string | null;
};

export type AdminAgencyList = { rows: AdminAgencyRow[]; counts: Record<AgencyFilter | "all", number> };

export async function listAgencies(filter: AgencyFilter | undefined): Promise<AdminAgencyList> {
  await requireAdmin();
  const db = createServiceClient();
  const [agencies, businesses, subscriptions, balances] = await Promise.all([
    allRows("agencies", (from, to) =>
      db
        .from("agencies")
        .select("id, name, owner_user_id, status, is_test, trial_ends_at, stripe_customer_id, created_at, deleted_at")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    allRows("businesses", (from, to) => db.from("businesses").select("agency_id").order("id").range(from, to)),
    allRows("plans", (from, to) =>
      db
        .from("business_subscriptions")
        .select("agency_id, status, plans(name)")
        .neq("status", "canceled")
        .order("business_id")
        .range(from, to),
    ),
    allRows("balances", (from, to) =>
      db
        .from("agency_credit_balance")
        .select("agency_id, plan_remaining, topup_remaining, overdraft")
        .order("agency_id")
        .range(from, to),
    ),
  ]);
  const emails = await emailsOf(agencies.map((a) => a.owner_user_id));

  const businessCount = new Map<string, number>();
  for (const b of businesses) if (b.agency_id) businessCount.set(b.agency_id, (businessCount.get(b.agency_id) ?? 0) + 1);
  const plansOf = new Map<string, string[]>();
  for (const s of subscriptions) plansOf.set(s.agency_id, [...(plansOf.get(s.agency_id) ?? []), s.plans?.name ?? "Unknown plan"]);
  const balanceOf = new Map(balances.map((b) => [b.agency_id, b]));

  const all = agencies.map((a): AdminAgencyRow => {
    const balance = balanceOf.get(a.id);
    return {
      id: a.id,
      name: a.name,
      ownerEmail: emails.get(a.owner_user_id) ?? null,
      status: a.status,
      isTest: a.is_test,
      businesses: businessCount.get(a.id) ?? 0,
      planMix: planMix(plansOf.get(a.id) ?? []),
      credits: {
        plan: balance?.plan_remaining ?? 0,
        topup: balance?.topup_remaining ?? 0,
        overdraft: balance?.overdraft ?? 0,
      },
      trialEndsAt: a.trial_ends_at,
      stripeLinked: a.stripe_customer_id !== null,
      createdAt: a.created_at,
      restoreUntil: restoreDeadline(a.status, a.deleted_at)?.toISOString() ?? null,
    };
  });

  const matches = (row: AdminAgencyRow, f: AgencyFilter) => (f === "test" ? row.isTest : row.status === f);
  const counts = { all: all.length } as AdminAgencyList["counts"];
  for (const f of ["trialing", "active", "past_due", "canceled", "suspended", "deleted", "test"] as const) {
    counts[f] = all.filter((r) => matches(r, f)).length;
  }
  return { rows: filter ? all.filter((r) => matches(r, filter)) : all, counts };
}

// Writes. Callers (actions.ts) run requireAdmin() and validate input first.

export type AgencyState = {
  status: string;
  isTest: boolean;
  trialEndsAt: string | null;
  subscriptionId: string | null;
  deletedAt: string | null;
};

export async function readAgencyState(agencyId: string): Promise<AgencyState | null> {
  const { data, error } = await createServiceClient()
    .from("agencies")
    .select("status, is_test, trial_ends_at, stripe_subscription_id, deleted_at")
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
    .update(clearDeletedAt ? { status: to, deleted_at: null } : { status: to })
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

/** The status recorded by the latest suspend, so unsuspend can put it back. */
export async function statusBeforeSuspend(agencyId: string): Promise<unknown> {
  const { data, error } = await createServiceClient()
    .from("admin_audit_log")
    .select("details")
    .eq("target_type", "agency")
    .eq("target_id", agencyId)
    .eq("action", "agency.suspend")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("read the last suspend", error);
  const details = data?.details;
  return details && typeof details === "object" && !Array.isArray(details) ? details.previous_status : undefined;
}
