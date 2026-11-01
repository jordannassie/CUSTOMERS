import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isOwnQuestion } from "../scores/counted";
import { questionTrends, TREND_WEEKS, weeklyScans, type QuestionTrends, type TrendCheck } from "./service";

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
    db.from("businesses").select("id").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
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
  const candidates = weeklyScans(
    runs.data!.map((r) => ({ id: r.id, at: new Date(r.started_at ?? r.created_at) })),
    TREND_WEEKS + 2,
  );
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
