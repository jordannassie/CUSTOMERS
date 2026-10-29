import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { emailsOf, unique } from "../../businesses/dal";
import { canRestore, displayStatus, restoreDeadline } from "../service";

const HISTORY = 20;

export type AuditOutcome = "started" | "done" | "failed";

export type AdminAgencyDetail = {
  agency: {
    id: string;
    name: string;
    status: string;
    /** The status as admin shows it (service.ts displayStatus). */
    displayStatus: string;
    isTest: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    stripeLinked: boolean;
    hasSubscription: boolean;
    createdAt: string;
    restoreUntil: string | null;
    canRestore: boolean;
  };
  ownerEmail: string | null;
  balance: { plan: number; topup: number; held: number; overdraft: number; total: number };
  businesses: {
    id: string;
    name: string;
    location: string;
    plan: string | null;
    planStatus: string | null;
    deleted: { at: string; purgeAfter: string | null } | null;
  }[];
  /** source is the grant's (trial, plan, topup, admin, promo, refund) for grants and expiries, else null. */
  ledger: { id: string; delta: number; kind: string; source: string | null; note: string | null; by: string | null; createdAt: string }[];
  /** outcome (BUG-278): 'started' when the result was never confirmed, 'failed' when the change did not happen. */
  audit: { id: string; action: string; reason: string | null; by: string | null; createdAt: string; outcome: AuditOutcome }[];
  /** Reasons given in the "Before you cancel" dialog (migration 062), newest first. */
  cancelReasons: { id: string; kind: string; reason: string; business: string | null; createdAt: string }[];
};

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin agency: could not load ${what}: ${error.message}`);
}

/** Just the name, for the page title ("Acme Agency | Admin"). Null for an unknown id. */
export async function loadAgencyName(agencyId: string): Promise<string | null> {
  await requireAdmin();
  const { data, error } = await createServiceClient().from("agencies").select("name").eq("id", agencyId).maybeSingle();
  if (error) fail("the agency name", error);
  return data?.name ?? null;
}

export async function loadAgencyDetail(agencyId: string, now = new Date()): Promise<AdminAgencyDetail | null> {
  await requireAdmin();
  const db = createServiceClient();
  const { data: a, error } = await db
    .from("agencies")
    .select(
      "id, name, owner_user_id, status, is_test, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id, created_at, purge_after",
    )
    .eq("id", agencyId)
    .maybeSingle();
  if (error) fail("the agency", error);
  if (!a) return null;

  const [balance, businesses, ledger, audit, reasons] = await Promise.all([
    db
      .from("agency_credit_balance")
      .select("plan_remaining, topup_remaining, held, balance, overdraft")
      .eq("agency_id", agencyId)
      .maybeSingle(),
    db
      .from("businesses")
      .select("id, name, primary_city, primary_region, deleted_at, purge_after, business_subscriptions(status, plans(name))")
      .eq("agency_id", agencyId)
      .order("created_at"),
    db
      .from("credit_transactions")
      .select("id, delta, kind, note, admin_user_id, created_at, credit_grants(source)")
      .eq("agency_id", agencyId)
      // Scan spending has its own pages; this list is grants, expiries and admin changes.
      .not("kind", "in", "(capture,release)")
      .order("created_at", { ascending: false })
      .limit(HISTORY),
    db
      .from("admin_audit_log")
      .select("id, action, details, admin_user_id, created_at, outcome")
      .eq("target_type", "agency")
      .eq("target_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(HISTORY),
    db
      .from("cancel_reasons")
      .select("id, kind, reason, created_at, businesses(name)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(HISTORY),
  ]);
  if (balance.error) fail("the balance", balance.error);
  if (businesses.error) fail("businesses", businesses.error);
  if (ledger.error) fail("the credit history", ledger.error);
  if (audit.error) fail("the audit log", audit.error);
  if (reasons.error) fail("the cancel reasons", reasons.error);

  const emails = await emailsOf(
    unique([a.owner_user_id, ...ledger.data.map((l) => l.admin_user_id), ...audit.data.map((l) => l.admin_user_id)]),
  );
  const b = balance.data;

  return {
    agency: {
      id: a.id,
      name: a.name,
      status: a.status,
      displayStatus: displayStatus({ status: a.status, hasSubscription: a.stripe_subscription_id !== null, trialEndsAt: a.trial_ends_at }, now),
      isTest: a.is_test,
      trialEndsAt: a.trial_ends_at,
      currentPeriodEnd: a.current_period_end,
      stripeLinked: a.stripe_customer_id !== null,
      hasSubscription: a.stripe_subscription_id !== null,
      createdAt: a.created_at,
      restoreUntil: restoreDeadline(a.status, a.purge_after)?.toISOString() ?? null,
      canRestore: canRestore(a.status, a.purge_after, now),
    },
    ownerEmail: emails.get(a.owner_user_id) ?? null,
    balance: {
      plan: b?.plan_remaining ?? 0,
      topup: b?.topup_remaining ?? 0,
      held: b?.held ?? 0,
      overdraft: b?.overdraft ?? 0,
      total: b?.balance ?? 0,
    },
    businesses: businesses.data.map((x) => ({
      id: x.id,
      name: x.name,
      location: [x.primary_city, x.primary_region].filter(Boolean).join(", "),
      plan: x.business_subscriptions?.plans?.name ?? null,
      planStatus: x.business_subscriptions?.status ?? null,
      deleted: x.deleted_at ? { at: x.deleted_at, purgeAfter: x.purge_after } : null,
    })),
    ledger: ledger.data.map((l) => ({
      id: l.id,
      delta: l.delta,
      kind: l.kind,
      source: l.credit_grants?.source ?? null,
      note: l.note,
      by: l.admin_user_id ? (emails.get(l.admin_user_id) ?? "Removed admin") : null,
      createdAt: l.created_at,
    })),
    audit: audit.data.map((l) => {
      const details = l.details && typeof l.details === "object" && !Array.isArray(l.details) ? l.details : {};
      return {
        id: l.id,
        action: l.action,
        reason: typeof details.reason === "string" ? details.reason : null,
        by: l.admin_user_id ? (emails.get(l.admin_user_id) ?? "Removed admin") : null,
        createdAt: l.created_at,
        outcome: l.outcome === "started" || l.outcome === "failed" ? l.outcome : "done",
      };
    }),
    cancelReasons: reasons.data.map((r) => ({
      id: r.id,
      kind: r.kind,
      reason: r.reason,
      business: r.businesses?.name ?? null,
      createdAt: r.created_at,
    })),
  };
}
