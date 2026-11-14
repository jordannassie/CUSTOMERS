import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { readBusiness } from "@/modules/business-reads";
import { isOwnQuestion } from "../scores/counted";
import { questionTrends, TREND_WEEKS, weeklyScans, type QuestionTrends, type TrendCheck } from "./service";

/** The newest scans always read, so a question's scan before its latest one is there even within the same week. */
const RECENT_SCANS = 6;

// Up or down per question: saved checks of the last weekly scans, read with the service role. Callers check the user
// may see this agency first.

// Enough finished scans to find 6 weekly ones even when a business scans every day.
const MAX_RUNS = 80;
const PAGE = 1000;

/** places: also where AI listed the business (SHOW_POSITION, D-63). */
export async function loadQuestionTrends(
  agencyId: string,
  businessId: string,
  now: Date,
  options: { places?: boolean } = {},
): Promise<QuestionTrends | null> {
  const db = createServiceClient();
  const [business, questions, runs] = await Promise.all([
    // The ownership check shares the Overview's business read (perf fix #3).
    readBusiness(businessId, agencyId),
    // Paused and removed questions are hidden.
    db.from("tracked_prompts").select("id, prompt, source").eq("business_id", businessId).eq("active", true).is("removed_at", null).order("created_at"),
    db
      .from("visibility_runs")
      .select("id, started_at, created_at")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(MAX_RUNS),
  ]);
  for (const r of [business, questions, runs]) if (r.error) throw new Error(`Question trends: ${r.error.message}`);
  if (!business.data) return null;

  // Two spare weeks, in case a week's latest scan asked none of today's questions.
  const allRuns = runs.data!.map((r) => ({ id: r.id, at: new Date(r.started_at ?? r.created_at) }));
  const weekly = weeklyScans(allRuns, TREND_WEEKS + 2);
  // Plus the latest scans, so "Questions that moved" compares each question's latest scan with the one before it, as
  // the Questions page does (MVP test, 2026-11-14). The weekly table still keeps one scan a week (service.ts).
  const latest = [...allRuns].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, RECENT_SCANS);
  const candidates = [...new Map([...weekly, ...latest].map((r) => [r.id, r])).values()].sort((a, b) => a.at.getTime() - b.at.getTime());
  const checks: TrendCheck[] = [];
  if (candidates.length) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        // The rows that count: no sample answers once the agency is real (migration 044).
        .from("visibility_results_counted")
        .select("run_id, tracked_prompt_id, provider, business_mentioned, mention_position")
        .in("run_id", candidates.map((c) => c.id))
        .not("tracked_prompt_id", "is", null)
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Question trends: could not read checks: ${error.message}`);
      for (const r of data) {
        if (r.run_id && r.tracked_prompt_id && r.provider) {
          checks.push({
            runId: r.run_id,
            promptId: r.tracked_prompt_id,
            provider: r.provider,
            named: r.business_mentioned === true,
            position: r.mention_position,
          });
        }
      }
      if (data.length < PAGE) break;
    }
  }
  return questionTrends(
    questions.data!.map((q) => ({ id: q.id, prompt: q.prompt, own: isOwnQuestion(q.source) })),
    candidates,
    checks,
    now,
    options,
  );
}
