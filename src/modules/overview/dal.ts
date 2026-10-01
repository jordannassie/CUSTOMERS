import "server-only";
import { requireAgency } from "@/modules/auth";
import { loadScoreReport } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { overviewView, type Impact, type OverviewView } from "./service";

// Legacy statuses: "in_progress" is still something to do, "resolved" and "dismissed" are not.
const OPEN_STATUSES = ["open", "in_progress"];
const STOPPED_AGENCIES = ["past_due", "canceled", "suspended", "deleted"];

/** The Overview for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getOverview(businessId: string): Promise<OverviewView | null> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  return loadOverview(agency.id, businessId, new Date());
}

// Callers check the viewer may see this agency first (the signed-in owner, or a live share link).
export async function loadOverview(agencyId: string, businessId: string, now: Date): Promise<OverviewView | null> {
  // 30 days before the window give the report its month-on-month change (DB-012).
  const report = await loadScoreReport(agencyId, businessId, now, { historyDays: 30 });
  if (!report) return null;

  // Ownership is settled by the report above.
  const db = createServiceClient();
  const [opportunities, business] = await Promise.all([
    db.from("opportunities").select("id, title, impact, created_at").eq("business_id", businessId).in("status", OPEN_STATUSES),
    db.from("businesses").select("status, next_scan_at, agencies!inner(status)").eq("id", businessId).single(),
  ]);
  if (opportunities.error) throw new Error(`Overview: could not read opportunities: ${opportunities.error.message}`);
  if (business.error) throw new Error(`Overview: could not read the business: ${business.error.message}`);
  // The same rule as the daily enqueue (migration 029): no scan comes for a paused business or a stopped account.
  const scheduled =
    business.data.status !== "paused" && !STOPPED_AGENCIES.includes(business.data.agencies.status) && business.data.next_scan_at;
  const nextScanAt = scheduled ? new Date(scheduled) : null;

  return overviewView(
    report,
    opportunities.data.map((o) => ({ id: o.id, title: o.title, impact: o.impact as Impact, createdAt: o.created_at })),
    { nextScanAt, now },
  );
}
