import "server-only";
import { requireAgency } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ProviderId } from "../providers/types";
import {
  SCORE_WINDOW_DAYS,
  competitorScores,
  trendSeries,
  visibilityScore,
  weeklyChange,
  type Change,
  type CompetitorScore,
  type ScoreCheck,
  type TrendPoint,
  type VisibilityScore,
} from "../scoring";
import { questionAppearances } from "./questions";

// 30-day score aggregates (B-30 step 2) from the visibility_checks_30d view (migration 032).
const PAGE = 1000;
const LAST_CHECKS_PER_QUESTION = 10;
const DAY_MS = 86_400_000;

export type ScoreReport = VisibilityScore & {
  /** The business's chosen models, in the order it saved them. */
  models: ProviderId[];
  trend: TrendPoint[];
  change: Change | null;
  lastCheckedAt: Date | null;
  competitors: {
    name: string;
    score: number;
    standing: CompetitorScore["standing"];
  }[];
  questions: {
    id: string;
    question: string;
    appeared: number;
    checks: number;
  }[];
};

/** The signed-in agency's score for one of its businesses; null when it is not theirs. */
export async function getScoreReport(businessId: string, options: { next?: string } = {}): Promise<ScoreReport | null> {
  const { agency } = await requireAgency(options);
  return loadScoreReport(agency.id, businessId, new Date());
}

// Callers check the user may see this agency first.
export async function loadScoreReport(agencyId: string, businessId: string, now: Date): Promise<ScoreReport | null> {
  const db = createServiceClient();
  const [business, competitors, questions] = await Promise.all([
    db.from("businesses").select("id, models").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("business_competitors").select("name").eq("business_id", businessId).order("name"),
    db
      .from("tracked_prompts")
      .select("id, prompt")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at"),
  ]);
  for (const r of [business, competitors, questions]) if (r.error) throw new Error(`Scores: ${r.error.message}`);
  if (!business.data) return null;

  const models = business.data.models as ProviderId[];
  const checks = await readChecks(businessId, new Date(now.getTime() - SCORE_WINDOW_DAYS * DAY_MS));
  const opts = { now, models };
  const appearances = new Map(
    questionAppearances(checks, {
      ...opts,
      last: LAST_CHECKS_PER_QUESTION,
    }).map((a) => [a.questionId, a]),
  );
  return {
    ...visibilityScore(checks, opts),
    models,
    trend: trendSeries(checks, opts),
    change: weeklyChange(checks, opts),
    lastCheckedAt: checks.at(-1)?.checkedAt ?? null,
    competitors: competitorScores(
      checks,
      competitors.data!.map((c) => c.name),
      opts,
    ).map((c) => ({
      name: c.name,
      score: c.estimate.score,
      standing: c.standing,
    })),
    questions: questions.data!.map((q) => ({
      id: q.id,
      question: q.prompt,
      appeared: appearances.get(q.id)?.appeared ?? 0,
      checks: appearances.get(q.id)?.checks ?? 0,
    })),
  };
}

async function readChecks(businessId: string, since: Date): Promise<ScoreCheck[]> {
  const checks: ScoreCheck[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_checks_30d")
      .select("id, provider, question_id, checked_at, business_mentioned, competitors, answer_key")
      .eq("business_id", businessId)
      .gt("checked_at", since.toISOString())
      .order("checked_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Scores: could not read checks: ${error.message}`);
    // View columns are typed nullable, but the underlying columns are not null.
    for (const r of data) {
      checks.push({
        provider: r.provider as ProviderId,
        questionId: r.question_id!,
        checkedAt: new Date(r.checked_at!),
        mentioned: r.business_mentioned!,
        competitorsMentioned: r.competitors ?? [],
        answerKey: r.answer_key!,
      });
    }
    if (data.length < PAGE) break;
  }
  return checks;
}
