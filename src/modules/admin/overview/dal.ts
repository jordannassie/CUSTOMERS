import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { emailsOf } from "../businesses/dal";
import { stripeDashboardPage } from "../agencies/detail/recent/dal";
import { adminStripeClient, type AdminStripeClient } from "../agencies/stripe";
import { displayStatus } from "../agencies/service";
import { loadUsageCostSince } from "../usage-cost/dal";
import { listOpenAlerts } from "../alerts/dal";
import { alertLinks, type AlertLink, type OpenAlert } from "../alerts/service";
import { countChange, lastDays, monthBounds, percentChange, sumDays, type MonthChange, type Revenue } from "./service";
import { loadOverdueScans, revenueSince, testCustomerIds, type OverdueScans } from "./sources/dal";

const RECENT = 6;

export type AdminOverview = {
  monthStart: string;
  agencies: number;
  activeTrials: number;
  payingBusinesses: number;
  /** Live businesses of real agencies, so paying businesses can be shown as a share of them. */
  businesses: number;
  /** Real agencies at the start of the month, for the Overview's then-and-now bars. */
  agenciesAtMonthStart: number;
  revenue: Revenue;
  creditsUsed: number;
  aiCostUsd: number;
  /** status is the display status (agencies/service.ts displayStatus). */
  recentSignups: { id: string; name: string; ownerEmail: string | null; status: string; isTest: boolean; createdAt: string }[];
  /** at is when the scan was queued (created_at), the time the Scans page shows. */
  recentFailedScans: { id: string; businessId: string; businessName: string; agencyName: string; error: string | null; at: string }[];
  /** With where to go about each one (alertLinks). */
  openAlerts: (OpenAlert & { links: AlertLink[] })[];
  /** Businesses the scheduler should have scanned by now (overdueBefore), oldest first; null when none are. */
  overdueScans: OverdueScans | null;
  /** Against last month (DB-018). Paying businesses have none: we keep no history of when a business started paying. */
  vsLastMonth: {
    agencies: MonthChange;
    trialsStarted: { thisMonth: number; lastMonth: number };
    credits: MonthChange;
    aiCost: MonthChange;
    revenue: MonthChange | null;
  };
  /** The last 30 days, oldest first. */
  spark: { day: string; credits: number; costUsd: number }[];
};

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin overview: could not load ${what}: ${error.message}`);
}

/**
 * Business numbers for this calendar month (UTC). Test agencies are left out of every count and list (D-61), unless
 * `includeTest` (the Overview's "Include test agencies" link). Stripe revenue leaves out test agencies' Stripe customers
 * the same way (admin audit 2026-11-12).
 */
export async function loadOverview(
  now = new Date(),
  stripe: AdminStripeClient | null = adminStripeClient(),
  { includeTest = false }: { includeTest?: boolean } = {},
): Promise<AdminOverview> {
  await requireAdmin();
  const db = createServiceClient();
  // One filter for every query: real agencies only, or real and test.
  const testFlags = includeTest ? [false, true] : [false];
  const { monthStart, lastMonthStart, lastMonthSameTime } = monthBounds(now);
  const [monthIso, lastMonthIso, sameTimeIso] = [monthStart, lastMonthStart, lastMonthSameTime].map((d) => d.toISOString());
  // Only the two Stripe revenue calls need the test agencies' Stripe customers, so the database counts start at once
  // instead of waiting for that read first (perf fix #4, 2026-11-13).
  const excludeCustomers: Promise<string[]> = includeTest ? Promise.resolve([]) : testCustomerIds(db);
  // One request, read twice: by the list and, as soon as it arrives, by the owner emails beside it.
  const signupsQuery = Promise.resolve(
    db
      .from("agencies")
      .select("id, name, owner_user_id, status, is_test, trial_ends_at, stripe_subscription_id, created_at")
      // Same rule as the numbers above, so the list never shows agencies the counts leave out.
      .in("is_test", testFlags)
      .order("created_at", { ascending: false })
      .limit(RECENT),
  );

  const [agencies, trials, paying, businesses, revenue, signups, emails, failed, openAlerts, history, overdueScans] = await Promise.all([
    db.from("agencies").select("id", { count: "exact", head: true }).in("is_test", testFlags).neq("status", "deleted"),
    // Running trials only: an unfinished signup (no subscription, no trial end) and an ended trial are left out.
    db
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .in("is_test", testFlags)
      .eq("status", "trialing")
      .or(`trial_ends_at.gt.${now.toISOString()},and(trial_ends_at.is.null,stripe_subscription_id.not.is.null)`),
    db
      .from("business_subscriptions")
      .select("business_id, agencies!inner(is_test)", { count: "exact", head: true })
      .eq("status", "active")
      .in("agencies.is_test", testFlags),
    db
      .from("businesses")
      .select("id, agencies!inner(is_test)", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("agencies.is_test", testFlags),
    excludeCustomers.then((excluded) => revenueSince(stripe, monthStart, excluded)),
    signupsQuery,
    signupsQuery.then((r) => (r.error ? new Map<string, string>() : emailsOf(r.data.map((a) => a.owner_user_id)))),
    db
      .from("scan_jobs")
      // Test agencies are left out here like everywhere else on the Overview.
      .select("id, business_id, error, created_at, businesses(name), agencies!inner(name, is_test)")
      .eq("status", "failed")
      .in("agencies.is_test", testFlags)
      .order("created_at", { ascending: false })
      .limit(RECENT),
    listOpenAlerts(db),
    loadHistory(db, stripe, { monthIso, lastMonthIso, sameTimeIso, lastMonthStart, lastMonthSameTime, now, testFlags, includeTest, excludeCustomers }),
    loadOverdueScans(db, now, testFlags),
  ]);
  for (const [what, r] of [["agencies", agencies], ["trials", trials], ["paying businesses", paying], ["businesses", businesses]] as const) {
    if (r.error) fail(what, r.error);
  }
  if (signups.error) fail("recent signups", signups.error);
  if (failed.error) fail("failed scans", failed.error);

  return {
    monthStart: monthStart.toISOString(),
    agencies: agencies.count ?? 0,
    activeTrials: trials.count ?? 0,
    payingBusinesses: paying.count ?? 0,
    businesses: businesses.count ?? 0,
    agenciesAtMonthStart: history.agenciesAtMonthStart,
    revenue,
    creditsUsed: history.thisMonth.credits,
    aiCostUsd: history.thisMonth.costUsd,
    recentSignups: signups.data.map((a) => ({
      id: a.id,
      name: a.name,
      ownerEmail: emails.get(a.owner_user_id) ?? null,
      status: displayStatus({ status: a.status, hasSubscription: a.stripe_subscription_id !== null, trialEndsAt: a.trial_ends_at }, now),
      isTest: a.is_test,
      createdAt: a.created_at,
    })),
    recentFailedScans: failed.data.map((j) => ({
      id: j.id,
      businessId: j.business_id,
      businessName: j.businesses?.name ?? "Deleted business",
      agencyName: j.agencies?.name ?? "",
      error: j.error,
      at: j.created_at,
    })),
    openAlerts: openAlerts.map((a) => ({ ...a, links: alertLinks(a.kind, stripeDashboardPage("webhooks")) })),
    overdueScans,
    vsLastMonth: {
      agencies: countChange(agencies.count ?? 0, history.agenciesAtMonthStart, monthStart),
      trialsStarted: history.trialsStarted,
      credits: percentChange(history.thisMonth.credits, history.lastMonth.credits),
      aiCost: percentChange(history.thisMonth.costUsd, history.lastMonth.costUsd),
      revenue:
        revenue.state === "ok" && history.lastMonthRevenue !== null ? percentChange(revenue.cents, history.lastMonthRevenue) : null,
    },
    spark: history.spark,
  };
}

type Db = ReturnType<typeof createServiceClient>;

/** Last month's numbers to compare with, and the 30 days behind the sparklines (DB-018). Test agencies as the caller says. */
async function loadHistory(
  db: Db,
  stripe: AdminStripeClient | null,
  t: {
    monthIso: string;
    lastMonthIso: string;
    sameTimeIso: string;
    lastMonthStart: Date;
    lastMonthSameTime: Date;
    now: Date;
    testFlags: boolean[];
    includeTest: boolean;
    excludeCustomers: Promise<string[]>;
  },
) {
  const started = (from: string, to: string) =>
    db
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .in("is_test", t.testFlags)
      .not("trial_ends_at", "is", null)
      .gte("created_at", from)
      .lt("created_at", to);
  const [atMonthStart, startedNow, startedBefore, usage, lastMonthRevenue] = await Promise.all([
    // Agencies deleted since the 1st still counted then.
    db
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .in("is_test", t.testFlags)
      .lt("created_at", t.monthIso)
      .or(`status.neq.deleted,deleted_at.gte.${t.monthIso}`),
    started(t.monthIso, t.now.toISOString()),
    started(t.lastMonthIso, t.sameTimeIso),
    loadUsageCostSince(t.lastMonthStart, t.includeTest, t.now),
    stripe ? t.excludeCustomers.then((excluded) => stripe.revenueSince(t.lastMonthStart, t.lastMonthSameTime, excluded)).catch(() => null) : null,
  ]);
  for (const [what, r] of [["agencies last month", atMonthStart], ["trials", startedNow], ["trials last month", startedBefore]] as const) {
    if (r.error) fail(what, r.error);
  }
  return {
    agenciesAtMonthStart: atMonthStart.count ?? 0,
    trialsStarted: { thisMonth: startedNow.count ?? 0, lastMonth: startedBefore.count ?? 0 },
    // Capped at the last day of last month, so a short month never pulls in this month's 1st.
    lastMonth: sumDays(usage.byDay, t.lastMonthStart, new Date(Math.min(t.lastMonthSameTime.getTime(), Date.parse(t.monthIso) - 1))),
    lastMonthRevenue,
    // One usage report from last month's 1st covers this month too, so it is read once, not twice.
    thisMonth: sumDays(usage.byDay, new Date(t.monthIso), t.now),
    spark: lastDays(usage.byDay, t.now),
  };
}
