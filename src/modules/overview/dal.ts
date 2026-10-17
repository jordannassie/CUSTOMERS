import "server-only";
import { env } from "@/lib/env";
import { requestNow } from "@/lib/request-now";
import { requireAgency } from "@/modules/auth";
import { loadQuestionTrends, loadScoreReport, type QuestionTrends } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { overviewView, scanFailuresFrom, type Impact, type OverviewView } from "./service";
import { HISTORY_DAYS } from "./trend";

// Legacy statuses: "in_progress" is still something to do, "resolved" and "dismissed" are not.
const OPEN_STATUSES = ["open", "in_progress"];
const STOPPED_AGENCIES = ["past_due", "canceled", "suspended", "deleted"];

/** The Overview for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getOverview(businessId: string): Promise<OverviewView | null> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  return loadOverview(agency.id, businessId, requestNow());
}

/**
 * Up or down per question at the last weekly scans; null when the business is not the agency's. With SHOW_POSITION
 * on, also where AI listed the business (D-63: off until decided).
 */
export async function getQuestionTrends(businessId: string): Promise<QuestionTrends | null> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  return loadQuestionTrends(agency.id, businessId, requestNow(), { places: env.SHOW_POSITION === "true" });
}

// Callers check the viewer may see this agency first (the signed-in owner, or a live share link).
export async function loadOverview(agencyId: string, businessId: string, now: Date): Promise<OverviewView | null> {
  // 90 days of history: the score at each scan (DB-002) and the month-on-month change (DB-012).
  const report = await loadScoreReport(agencyId, businessId, now, { historyDays: HISTORY_DAYS });
  if (!report) return null;

  // Ownership is settled by the report above.
  const db = createServiceClient();
  const [opportunities, business, lastRun] = await Promise.all([
    db.from("opportunities").select("id, title, impact, created_at").eq("business_id", businessId).in("status", OPEN_STATUSES),
    db.from("businesses").select("status, next_scan_at, agencies!inner(status)").eq("id", businessId).single(),
    // Which AIs failed in the latest finished scan (BUG-074).
    db
      .from("visibility_runs")
      .select("failed_by_provider")
      .eq("business_id", businessId)
      .in("status", ["completed", "failed"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (opportunities.error) throw new Error(`Overview: could not read opportunities: ${opportunities.error.message}`);
  if (business.error) throw new Error(`Overview: could not read the business: ${business.error.message}`);
  if (lastRun.error) throw new Error(`Overview: could not read the last scan: ${lastRun.error.message}`);
  // The same rule as the daily enqueue (migration 029): no scan comes for a paused business or a stopped account.
  const scheduled =
    business.data.status !== "paused" && !STOPPED_AGENCIES.includes(business.data.agencies.status) && business.data.next_scan_at;
  const nextScanAt = scheduled ? new Date(scheduled) : null;

  return overviewView(
    report,
    opportunities.data.map((o) => ({ id: o.id, title: o.title, impact: o.impact as Impact, createdAt: o.created_at })),
    { nextScanAt, now, lastScanFailures: scanFailuresFrom(lastRun.data?.failed_by_provider) },
  );
}
