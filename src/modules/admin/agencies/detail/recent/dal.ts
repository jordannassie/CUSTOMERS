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
  /** Links into the Stripe dashboard, in the mode of the key in use (test keys open the test dashboard). */
  stripe: { customerUrl: string | null; subscriptionUrl: string | null };
  /** Credits the agency's scans used in the last 30 days (free ones counted apart) and what the AI calls cost us. */
  lastDays: { days: number; credits: number; freeCredits: number; costUsd: number };
  scans: { id: string; status: string; businessId: string; businessName: string; error: string | null; at: string }[];
};

export function stripeDashboardUrl(kind: "customers" | "subscriptions", id: string | null, key = env.STRIPE_SECRET_KEY): string | null {
  if (!id) return null;
  const test = !!key && /^(sk|rk)_test_/.test(key);
  return `https://dashboard.stripe.com/${test ? "test/" : ""}${kind}/${encodeURIComponent(id)}`;
}

export async function loadAgencyRecent(agencyId: string, now = new Date()): Promise<AgencyRecent | null> {
  await requireAdmin();
  const db = createServiceClient();
  const since = new Date(now.getTime() - DAYS * 86_400_000);
  const [agency, scans, usage] = await Promise.all([
    db.from("agencies").select("stripe_customer_id, stripe_subscription_id").eq("id", agencyId).maybeSingle(),
    db
      .from("scan_jobs")
      .select("id, status, business_id, error, created_at, finished_at, businesses(name)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(RECENT_SCANS),
    // Test agencies included: the filter is this one agency.
    loadUsageCostSince(since, true, now, agencyId),
  ]);
  if (agency.error) throw new Error(`Admin agency: ${agency.error.message}`);
  if (scans.error) throw new Error(`Admin agency: ${scans.error.message}`);
  if (!agency.data) return null;

  return {
    stripe: {
      customerUrl: stripeDashboardUrl("customers", agency.data.stripe_customer_id),
      subscriptionUrl: stripeDashboardUrl("subscriptions", agency.data.stripe_subscription_id),
    },
    lastDays: { days: DAYS, credits: usage.totals.credits, freeCredits: usage.totals.freeCredits, costUsd: usage.totals.costUsd },
    scans: scans.data.map((s) => ({
      id: s.id,
      status: s.status,
      businessId: s.business_id,
      businessName: s.businesses?.name ?? "Deleted business",
      error: s.error,
      at: s.finished_at ?? s.created_at,
    })),
  };
}
