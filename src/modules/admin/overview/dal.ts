import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { emailsOf } from "../businesses/dal";
import { startOfMonthUtc } from "../businesses/service";
import { adminStripeClient, type AdminStripeClient } from "../agencies/stripe";
import { loadUsageCostSince } from "../usage-cost/dal";
import { openAlertsPlaceholder, type OpenAlert, type Revenue } from "./service";

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
};

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin overview: could not load ${what}: ${error.message}`);
}

/** Business numbers for this calendar month (UTC). Test agencies are left out of every count (D-61). */
export async function loadOverview(now = new Date(), stripe: AdminStripeClient | null = adminStripeClient()): Promise<AdminOverview> {
  await requireAdmin();
  const db = createServiceClient();
  const monthStart = startOfMonthUtc(now);

  const [agencies, trials, paying, usage, revenue, signups, failed] = await Promise.all([
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
    openAlerts: openAlertsPlaceholder(),
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
