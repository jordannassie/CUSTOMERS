import "server-only";
import { requireAgency } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ProviderId } from "../providers/types";
import {
  SCORE_WINDOW_DAYS,
  competitorScores,
  trendSeries,
  visibilityScore,
  type CompetitorScore,
  type ScoreCheck,
  type TrendPoint,
  type VisibilityScore,
} from "../scoring";
import { answerKeys } from "./answer-keys";
import { questionAppearances } from "./questions";

// 30-day score aggregates (B-30 step 2), read with a plain query until a SQL view lands after B-27.
const PAGE = 1000;
const LAST_CHECKS_PER_QUESTION = 10;
const DAY_MS = 86_400_000;

export type ScoreReport = VisibilityScore & {
  trend: TrendPoint[];
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
    trend: trendSeries(checks, opts),
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
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_results")
      .select("id, provider, tracked_prompt_id, created_at, business_mentioned, competitors_mentioned, cached")
      .eq("business_id", businessId)
      .gt("created_at", since.toISOString())
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Scores: could not read checks: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  const saved = rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    // Old results may have no question; they still count toward the score as one cluster.
    questionId: r.tracked_prompt_id ?? "none",
    checkedAt: new Date(r.created_at),
    cached: r.cached,
  }));
  const keys = answerKeys(saved);
  return rows.map((r, i) => ({
    provider: r.provider as ProviderId,
    questionId: saved[i].questionId,
    checkedAt: saved[i].checkedAt,
    mentioned: r.business_mentioned,
    competitorsMentioned: competitorNames(r.competitors_mentioned),
    answerKey: keys.get(r.id)!,
  }));
}

// Stored by check.ts as [{ name, position }]; anything else counts as no competitor named.
function competitorNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) => (c && typeof c === "object" && typeof c.name === "string" ? [c.name] : []));
}
