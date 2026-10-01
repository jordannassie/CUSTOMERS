import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { emailsOf } from "../businesses/dal";
import { adminStripeClient, type AdminStripeClient } from "../agencies/stripe";
import { loadUsageCostSince } from "../usage-cost/dal";
import { listOpenAlerts } from "../alerts/dal";
import type { OpenAlert } from "../alerts/service";
import { countChange, lastDays, monthBounds, percentChange, sumDays, type MonthChange, type Revenue } from "./service";

const RECENT = 6;

export type AdminOverview = {
  monthStart: string;
  agencies: number;
  activeTrials: number;
  payingBusinesses: number;
  revenue: Revenue;
  creditsUsed: number;
  aiCostUsd: number;
  recentSignups: { id: string; name: string; ownerEmail: string | null; status: string; isTest: boolean; createdAt: string }[];
  recentFailedScans: { id: string; businessId: string; businessName: string; agencyName: string; error: string | null; at: string }[];
  openAlerts: OpenAlert[];
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

/** Business numbers for this calendar month (UTC). Test agencies are left out of every count (D-61). */
export async function loadOverview(now = new Date(), stripe: AdminStripeClient | null = adminStripeClient()): Promise<AdminOverview> {
  await requireAdmin();
  const db = createServiceClient();
  const { monthStart, lastMonthStart, lastMonthSameTime } = monthBounds(now);
  const [monthIso, lastMonthIso, sameTimeIso] = [monthStart, lastMonthStart, lastMonthSameTime].map((d) => d.toISOString());

  const [agencies, trials, paying, usage, revenue, signups, failed, openAlerts, history] = await Promise.all([
    db.from("agencies").select("id", { count: "exact", head: true }).eq("is_test", false).neq("status", "deleted"),
    db.from("agencies").select("id", { count: "exact", head: true }).eq("is_test", false).eq("status", "trialing"),
    db
      .from("business_subscriptions")
      .select("business_id, agencies!inner(is_test)", { count: "exact", head: true })
      .eq("status", "active")
      .eq("agencies.is_test", false),
    loadUsageCostSince(monthStart, false, now),
    revenueSince(stripe, monthStart),
    db
      .from("agencies")
      .select("id, name, owner_user_id, status, is_test, created_at")
      .order("created_at", { ascending: false })
      .limit(RECENT),
    db
      .from("scan_jobs")
      .select("id, business_id, error, created_at, finished_at, businesses(name), agencies(name)")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(RECENT),
    listOpenAlerts(db),
    loadHistory(db, stripe, { monthIso, lastMonthIso, sameTimeIso, lastMonthStart, lastMonthSameTime, now }),
  ]);
  for (const [what, r] of [["agencies", agencies], ["trials", trials], ["paying businesses", paying]] as const) {
    if (r.error) fail(what, r.error);
  }
  if (signups.error) fail("recent signups", signups.error);
  if (failed.error) fail("failed scans", failed.error);
  const emails = await emailsOf(signups.data.map((a) => a.owner_user_id));

  return {
    monthStart: monthStart.toISOString(),
    agencies: agencies.count ?? 0,
    activeTrials: trials.count ?? 0,
    payingBusinesses: paying.count ?? 0,
    revenue,
    creditsUsed: usage.totals.credits,
    aiCostUsd: usage.totals.costUsd,
    recentSignups: signups.data.map((a) => ({
      id: a.id,
      name: a.name,
      ownerEmail: emails.get(a.owner_user_id) ?? null,
      status: a.status,
      isTest: a.is_test,
      createdAt: a.created_at,
    })),
    recentFailedScans: failed.data.map((j) => ({
      id: j.id,
      businessId: j.business_id,
      businessName: j.businesses?.name ?? "Deleted business",
      agencyName: j.agencies?.name ?? "",
      error: j.error,
      at: j.finished_at ?? j.created_at,
    })),
    openAlerts,
    vsLastMonth: {
      agencies: countChange(agencies.count ?? 0, history.agenciesAtMonthStart, monthStart),
      trialsStarted: history.trialsStarted,
      credits: percentChange(usage.totals.credits, history.lastMonth.credits),
      aiCost: percentChange(usage.totals.costUsd, history.lastMonth.costUsd),
      revenue:
        revenue.state === "ok" && history.lastMonthRevenue !== null ? percentChange(revenue.cents, history.lastMonthRevenue) : null,
    },
    spark: history.spark,
  };
}

type Db = ReturnType<typeof createServiceClient>;

/** Last month's numbers to compare with, and the 30 days behind the sparklines (DB-018). Test agencies left out. */
async function loadHistory(
  db: Db,
  stripe: AdminStripeClient | null,
  t: { monthIso: string; lastMonthIso: string; sameTimeIso: string; lastMonthStart: Date; lastMonthSameTime: Date; now: Date },
) {
  const started = (from: string, to: string) =>
    db
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .eq("is_test", false)
      .not("trial_ends_at", "is", null)
      .gte("created_at", from)
      .lt("created_at", to);
  const [atMonthStart, startedNow, startedBefore, usage, lastMonthRevenue] = await Promise.all([
    // Agencies deleted since the 1st still counted then.
    db
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .eq("is_test", false)
      .lt("created_at", t.monthIso)
      .or(`status.neq.deleted,deleted_at.gte.${t.monthIso}`),
    started(t.monthIso, t.now.toISOString()),
    started(t.lastMonthIso, t.sameTimeIso),
    loadUsageCostSince(t.lastMonthStart, false, t.now),
    stripe ? stripe.revenueSince(t.lastMonthStart, t.lastMonthSameTime).catch(() => null) : null,
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
    spark: lastDays(usage.byDay, t.now),
  };
}

async function revenueSince(stripe: AdminStripeClient | null, since: Date): Promise<Revenue> {
  if (!stripe) return { state: "not_connected" };
  try {
    return { state: "ok", cents: await stripe.revenueSince(since), mode: stripe.mode };
  } catch (error) {
    console.error("Admin overview: Stripe revenue failed", error);
    return { state: "error" };
  }
}
