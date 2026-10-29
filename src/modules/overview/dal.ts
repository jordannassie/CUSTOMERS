import "server-only";
import { OPEN_FIX_STATUSES } from "@/lib/fix-status";
import { env } from "@/lib/env";
import { requestNow } from "@/lib/request-now";
import { requireAgency } from "@/modules/auth";
import { loadQuestionTrends, loadScoreReport, type QuestionTrends } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { loadLastScanFailures } from "./last-scan/dal";
import { overviewView, type Impact, type OverviewView } from "./service";
import { HISTORY_DAYS } from "./trend";

// Suggested, To do and In progress are still to do; "resolved" and "dismissed" are not.
const OPEN_STATUSES = OPEN_FIX_STATUSES;
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
    loadLastScanFailures(businessId),
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
    {
      nextScanAt,
      now,
      lastScanFailures: lastRun.failures,
      lastScanSkipped: lastRun.skipped,
    },
  );
}
