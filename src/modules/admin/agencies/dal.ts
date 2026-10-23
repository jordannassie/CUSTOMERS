import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { allRows, emailsOf, inList, userIdsByEmail } from "../businesses/dal";
import { ADMIN_PAGE_SIZE } from "../schema";
import { AGENCY_FILTERS, type AgencyFilter } from "./schema";
import { displayStatus, planMix, restoreDeadline, type BillingStatus } from "./service";

// Admin reads cross every agency, so they use the service role after requireAdmin().

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin agencies: could not ${what}: ${error.message}`);
}

export type AdminAgencyRow = {
  id: string;
  name: string;
  ownerEmail: string | null;
  status: string;
  /** What the list shows: the status, or "signup_unfinished" / "trial_ended" for a trial that is not running. */
  displayStatus: string;
  isTest: boolean;
  businesses: number;
  planMix: string;
  credits: { plan: number; topup: number; overdraft: number };
  trialEndsAt: string | null;
  stripeLinked: boolean;
  createdAt: string;
  restoreUntil: string | null;
};

export type AdminAgencyList = {
  rows: AdminAgencyRow[];
  /** Per filter tab, among the agencies the search matches. */
  counts: Record<AgencyFilter | "all", number>;
  /** Agencies in this filter and search, on every page. */
  total: number;
  page: number;
  pages: number;
};

/**
 * One filter tab as a PostgREST condition. The display statuses (service.ts displayStatus) are written out so the
 * database filters and counts them: a running trial, an ended one, and a signup that never reached Stripe.
 */
export function filterCondition(filter: AgencyFilter, nowIso: string): string {
  switch (filter) {
    case "trialing":
      return `and(status.eq.trialing,or(trial_ends_at.gt.${nowIso},and(trial_ends_at.is.null,stripe_subscription_id.not.is.null)))`;
    case "trial_ended":
      return `and(status.eq.trialing,trial_ends_at.lte.${nowIso})`;
    case "signup_unfinished":
      return "and(status.eq.trialing,trial_ends_at.is.null,stripe_subscription_id.is.null)";
    case "test":
      return "is_test.is.true";
    default:
      return `status.eq.${filter}`;
  }
}

/** The search box as a condition: the agency name, or the owner's login email. Null without a search. */
async function searchCondition(search: string): Promise<string | null> {
  if (!search) return null;
  return `or(name.ilike."%${search}%",owner_user_id.in.${inList(await userIdsByEmail(search))})`;
}

/** One page of agencies, newest first, for a filter tab and a search (name or owner email). */
export async function listAgencies(
  { filter, search = "", page = 1 }: { filter?: AgencyFilter; search?: string; page?: number },
  now = new Date(),
): Promise<AdminAgencyList> {
  await requireAdmin();
  const db = createServiceClient();
  const nowIso = now.toISOString();
  const searched = await searchCondition(search);
  // Every condition must hold; one `or` param keeps PostgREST from seeing two.
  const where = (extra: string | null) => {
    const parts = [searched, extra].filter((p): p is string => p !== null);
    return parts.length ? `and(${parts.join(",")})` : null;
  };
  const counted = (extra: string | null) => {
    const query = db.from("agencies").select("id", { count: "exact", head: true });
    const condition = where(extra);
    return condition ? query.or(condition) : query;
  };

  const [countResults, pageResult] = await Promise.all([
    Promise.all([counted(null), ...AGENCY_FILTERS.map((f) => counted(filterCondition(f, nowIso)))]),
    (async () => {
      let query = db
        .from("agencies")
        .select("id, name, owner_user_id, status, is_test, trial_ends_at, stripe_customer_id, stripe_subscription_id, created_at, purge_after", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("id")
        .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
      const condition = where(filter ? filterCondition(filter, nowIso) : null);
      if (condition) query = query.or(condition);
      return query;
    })(),
  ]);
  for (const r of countResults) if (r.error) fail("agency counts", r.error);
  if (pageResult.error) fail("agencies", pageResult.error);
  const counts = { all: countResults[0].count ?? 0 } as AdminAgencyList["counts"];
  AGENCY_FILTERS.forEach((f, i) => (counts[f] = countResults[i + 1].count ?? 0));

  const agencies = pageResult.data;
  const ids = agencies.map((a) => a.id);
  const [businesses, subscriptions, balances, emails] = await Promise.all([
    allRows("businesses", (from, to) => db.from("businesses").select("agency_id").in("agency_id", ids).order("id").range(from, to)),
    allRows("plans", (from, to) =>
      db
        .from("business_subscriptions")
        .select("agency_id, status, plans(name)")
        .in("agency_id", ids)
        .neq("status", "canceled")
        .order("business_id")
        .range(from, to),
    ),
    allRows("balances", (from, to) =>
      db
        .from("agency_credit_balance")
        .select("agency_id, plan_remaining, topup_remaining, overdraft")
        .in("agency_id", ids)
        .order("agency_id")
        .range(from, to),
    ),
    emailsOf(agencies.map((a) => a.owner_user_id)),
  ]);

  const businessCount = new Map<string, number>();
  for (const b of businesses) if (b.agency_id) businessCount.set(b.agency_id, (businessCount.get(b.agency_id) ?? 0) + 1);
  const plansOf = new Map<string, string[]>();
  for (const s of subscriptions) plansOf.set(s.agency_id, [...(plansOf.get(s.agency_id) ?? []), s.plans?.name ?? "Unknown plan"]);
  const balanceOf = new Map(balances.map((b) => [b.agency_id, b]));

  const rows = agencies.map((a): AdminAgencyRow => {
    const balance = balanceOf.get(a.id);
    return {
      id: a.id,
      name: a.name,
      ownerEmail: emails.get(a.owner_user_id) ?? null,
      status: a.status,
      displayStatus: displayStatus({ status: a.status, hasSubscription: a.stripe_subscription_id !== null, trialEndsAt: a.trial_ends_at }, now),
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
      restoreUntil: restoreDeadline(a.status, a.purge_after)?.toISOString() ?? null,
    };
  });

  const total = pageResult.count ?? 0;
  return { rows, counts, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

// Writes. Callers (actions.ts) run requireAdmin() and validate input first.

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
