import "server-only";
// The answers "we will measure the effect" compares (B-98): the score's own counted answers (visibility_checks_all,
// suggested and active questions only, each answer key once), around each done action's date. One read per board,
// only when it has done actions, and never the answer text.
import { createServiceClient } from "@/lib/supabase/service";
import { readQuestions } from "@/modules/business-reads";
import { countsInScore } from "@/modules/scanning";
import { effectReadFrom, measureEffect, type ActionEffect, type EffectCheck } from "./service";

const PAGE = 1000;

/** The effect of each done action, by id. Callers check the business is the agency's first. */
export async function loadEffects(businessId: string, done: { id: string; completedAt: string }[], now = new Date()): Promise<Map<string, ActionEffect>> {
  const effects = new Map<string, ActionEffect>();
  const from = effectReadFrom(done.map((d) => new Date(d.completedAt)));
  if (!from) return effects;

  const questions = await readQuestions(businessId);
  if (questions.error) throw new Error(`Actions: could not read questions: ${questions.error.message}`);
  const scored = new Set((questions.data ?? []).filter(countsInScore).map((q) => q.id));

  const checks: EffectCheck[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_checks_all")
      .select("id, question_id, checked_at, business_mentioned, answer_key")
      .eq("business_id", businessId)
      .gt("checked_at", from.toISOString())
      .order("checked_at")
      .order("id")
      .range(start, start + PAGE - 1);
    if (error) throw new Error(`Actions: could not read answers for done actions: ${error.message}`);
    for (const r of data) {
      if (!r.question_id || !scored.has(r.question_id) || !r.checked_at || !r.answer_key) continue;
      checks.push({ checkedAt: new Date(r.checked_at), mentioned: r.business_mentioned === true, answerKey: r.answer_key });
    }
    if (data.length < PAGE) break;
  }

  // When each scan finished, so two scans minutes apart count as two.
  const runs = await createServiceClient()
    .from("visibility_runs")
    .select("completed_at")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .gt("completed_at", from.toISOString());
  if (runs.error) throw new Error(`Actions: could not read scans for done actions: ${runs.error.message}`);
  const scansFinished = runs.data.flatMap((r) => (r.completed_at ? [new Date(r.completed_at)] : []));

  for (const d of done) effects.set(d.id, measureEffect(new Date(d.completedAt), checks, scansFinished, now));
  return effects;
}
