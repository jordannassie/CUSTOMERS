import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/modules/auth";
import { loadUsageCostSince } from "../../../usage-cost/dal";

// The agency page's "Last 30 days", recent scans and Stripe links (admin review 2026-11-12), loaded apart from the
// rest of the page so the slower usage sums never hold it up.

const DAYS = 30;
const RECENT_SCANS = 8;

export type AgencyRecent = {
  /**
   * Credits the agency's scans used in the last 30 days (free ones counted apart) and what the AI calls cost us, split
   * into scan checks and every other AI job (setup auto-fill, question picking, name reading, explanations), so a cost
   * with no scans explains itself (QA round 2, item 8). allTimeCredits: every credit a scan ever used, so a balance
   * below the plan total can be read against it.
   */
  lastDays: { days: number; credits: number; freeCredits: number; costUsd: number; checkCostUsd: number; otherCostUsd: number };
  allTimeCredits: number;
  /** Newest first by when each scan was queued (created_at), the time the Scans and Businesses pages show. */
  scans: RecentScan[];
  /** The newest scan that ran (done or failed): skipped and waiting ones did not. Null when none has. */
  lastRun: RecentScan | null;
};

type RecentScan = { id: string; status: string; businessId: string; businessName: string; error: string | null; at: string };

/** A page of the Stripe dashboard (webhooks, events), in the mode of the key in use. */
export function stripeDashboardPage(page: "webhooks" | "events", key = env.STRIPE_SECRET_KEY): string {
  return `${dashboard(key)}${page}`;
}

// Test keys open the test dashboard, live keys the live one.
const dashboard = (key: string | undefined) => `https://dashboard.stripe.com/${key && /^(sk|rk)_test_/.test(key) ? "test/" : ""}`;

export function stripeDashboardUrl(kind: "customers" | "subscriptions", id: string | null, key = env.STRIPE_SECRET_KEY): string | null {
  return id ? `${dashboard(key)}${kind}/${encodeURIComponent(id)}` : null;
}

export async function loadAgencyRecent(agencyId: string, now = new Date()): Promise<AgencyRecent | null> {
  await requireAdmin();
  const db = createServiceClient();
  const since = new Date(now.getTime() - DAYS * 86_400_000);
  const scanRows = () => db.from("scan_jobs").select("id, status, business_id, error, created_at, businesses(name)").eq("agency_id", agencyId);
  const [agency, scans, lastRun, usage, allTimeCredits] = await Promise.all([
    db.from("agencies").select("id").eq("id", agencyId).maybeSingle(),
    scanRows().order("created_at", { ascending: false }).order("id").limit(RECENT_SCANS),
    scanRows().in("status", ["done", "failed"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    // Test agencies included: the filter is this one agency.
    loadUsageCostSince(since, true, now, agencyId),
    capturedSinceSignup(agencyId, now),
  ]);
  if (agency.error) throw new Error(`Admin agency: ${agency.error.message}`);
  if (scans.error) throw new Error(`Admin agency: ${scans.error.message}`);
  if (lastRun.error) throw new Error(`Admin agency: ${lastRun.error.message}`);
  if (!agency.data) return null;

  return {
    lastDays: {
      days: DAYS,
      credits: usage.totals.credits,
      freeCredits: usage.totals.freeCredits,
      costUsd: usage.totals.costUsd,
      checkCostUsd: usage.totals.costUsd - usage.otherCostUsd,
      otherCostUsd: usage.otherCostUsd,
    },
    allTimeCredits,
    scans: scans.data.map(recentScan),
    lastRun: lastRun.data ? recentScan(lastRun.data) : null,
  };
}

function recentScan(s: {
  id: string;
  status: string;
  business_id: string;
  error: string | null;
  created_at: string;
  businesses: { name: string } | null;
}): RecentScan {
  return {
    id: s.id,
    status: s.status,
    businessId: s.business_id,
    businessName: s.businesses?.name ?? "Deleted business",
    error: s.error,
    at: s.created_at,
  };
}

/** Every credit the agency's scans used since it signed up: the same per-day sums Usage reads, from the start. */
async function capturedSinceSignup(agencyId: string, now: Date): Promise<number> {
  const db = createServiceClient();
  const args = { p_from: new Date(0).toISOString(), p_to: now.toISOString(), p_include_test: true, p_agency_id: agencyId };
  const PAGE = 1000;
  let total = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.rpc("admin_usage_credits", args).order("day").order("provider").order("paid").range(from, from + PAGE - 1);
    if (error) throw new Error(`Admin agency: credits used: ${error.message}`);
    total += data.reduce((sum, row) => sum + Number(row.credits), 0);
    if (data.length < PAGE) return total;
  }
}
