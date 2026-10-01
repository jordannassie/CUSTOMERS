import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { requestNow } from "@/lib/request-now";
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
import {
  competitorWeeklyChange,
  modelWeeklyChanges,
  monthlyChange,
  scoreHistory,
  weeklyChange,
  type Change,
  type ScanPoint,
} from "../scoring-periods";
import { questionAppearances, questionAppearancesByModel, type ModelAppearance } from "./questions";

// 30-day score aggregates (B-30 step 2) from the visibility_checks_30d view (migration 032).
const PAGE = 1000;
const LAST_CHECKS_PER_QUESTION = 10;
const DAY_MS = 86_400_000;

export type ScoreReport = VisibilityScore & {
  /** The business's chosen models, in the order it saved them. */
  models: ProviderId[];
  trend: TrendPoint[];
  /** The 30-day score at each scan over the `historyDays` asked for, oldest first (DB-002). */
  history: ScanPoint[];
  change: Change | null;
  /** Each model's weekly change, only where it is bigger than the margin (DB-013). */
  modelChanges: Partial<Record<ProviderId, Change>>;
  /** The 30 days against the 30 before; null unless asked for with `historyDays` (DB-012). */
  monthChange: Change | null;
  /** The oldest check in the window; a competitor added after it was not looked for on every check (F-53). */
  firstCheckedAt: Date | null;
  lastCheckedAt: Date | null;
  competitors: {
    name: string;
    score: number;
    standing: CompetitorScore["standing"];
    /** Weekly change in how often AI named it, only outside the margin (DB-013). */
    change: Change | null;
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
  return loadScoreReport(agency.id, businessId, requestNow());
}

// React's cache lasts one server request: the Overview, its "Who AI picked instead" block and the business switcher
// all score the active business, and the share page scores it twice, yet each read happens once.
const scoreInputs = cache((agencyId: string, businessId: string) => {
  const db = createServiceClient();
  return Promise.all([
    db.from("businesses").select("id, models").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("business_competitors").select("name").eq("business_id", businessId).order("name"),
    db.from("tracked_prompts").select("id, prompt").eq("business_id", businessId).eq("active", true).order("created_at"),
  ]);
});
const windowChecks = cache((businessId: string, sinceMs: number) => readChecks(businessId, new Date(sinceMs)));
const olderChecks = cache((businessId: string, fromMs: number, toMs: number) =>
  readOlderChecks(businessId, new Date(fromMs), new Date(toMs)),
);

export type ReportOptions = {
  /** Days before the 30-day window to read as well, for comparisons with earlier periods. */
  historyDays?: number;
};

// Callers check the user may see this agency first.
export async function loadScoreReport(
  agencyId: string,
  businessId: string,
  now: Date,
  options: ReportOptions = {},
): Promise<ScoreReport | null> {
  const [business, competitors, questions] = await scoreInputs(agencyId, businessId);
  for (const r of [business, competitors, questions]) if (r.error) throw new Error(`Scores: ${r.error.message}`);
  if (!business.data) return null;

  const models = business.data.models as ProviderId[];
  const windowStart = new Date(now.getTime() - SCORE_WINDOW_DAYS * DAY_MS);
  const historyDays = options.historyDays ?? 0;
  const start = windowStart.getTime();
  const [checks, older] = await Promise.all([
    windowChecks(businessId, start),
    historyDays > 0 ? olderChecks(businessId, start - historyDays * DAY_MS, start) : [],
  ]);
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
    history: historyDays > 0 ? scoreHistory([...older, ...checks], { ...opts, days: historyDays }) : [],
    change: weeklyChange(checks, opts),
    modelChanges: modelWeeklyChanges(checks, opts),
    monthChange: historyDays > 0 ? monthlyChange([...older, ...checks], opts) : null,
    firstCheckedAt: checks[0]?.checkedAt ?? null,
    lastCheckedAt: checks.at(-1)?.checkedAt ?? null,
    competitors: competitorScores(
      checks,
      competitors.data!.map((c) => c.name),
      opts,
    ).map((c) => ({
      name: c.name,
      score: c.estimate.score,
      standing: c.standing,
      change: competitorWeeklyChange(checks, c.name, opts),
    })),
    questions: questions.data!.map((q) => ({
      id: q.id,
      question: q.prompt,
      appeared: appearances.get(q.id)?.appeared ?? 0,
      checks: appearances.get(q.id)?.checks ?? 0,
    })),
  };
}

/** Per question and model: appeared in X of the last Y checks. Callers check the user may see this business first. */
export async function loadQuestionResults(
  businessId: string,
  models: readonly ProviderId[],
  now: Date,
): Promise<Map<string, ModelAppearance[]>> {
  const checks = await readChecks(businessId, new Date(now.getTime() - SCORE_WINDOW_DAYS * DAY_MS));
  return questionAppearancesByModel(checks, { now, models, last: LAST_CHECKS_PER_QUESTION });
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

/**
 * Checks older than the visibility_checks_30d view keeps, read from visibility_results and shaped the same way
 * (migration 032): the same answer key, so an answer repeated across the 30-day line still counts once.
 */
export async function readOlderChecks(businessId: string, from: Date, to: Date): Promise<ScoreCheck[]> {
  const checks: ScoreCheck[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_results")
      .select("id, provider, tracked_prompt_id, created_at, business_mentioned, competitors_mentioned, answer_text")
      .eq("business_id", businessId)
      .gt("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at")
      .order("id")
      .range(start, start + PAGE - 1);
    if (error) throw new Error(`Scores: could not read older checks: ${error.message}`);
    for (const r of data) {
      checks.push({
        provider: r.provider as ProviderId,
        questionId: r.tracked_prompt_id ?? "none",
        checkedAt: new Date(r.created_at),
        mentioned: r.business_mentioned,
        competitorsMentioned: competitorNames(r.competitors_mentioned),
        answerKey: r.answer_text === null ? r.id : createHash("md5").update(r.provider + r.answer_text).digest("hex"),
      });
    }
    if (data.length < PAGE) break;
  }
  return checks;
}

function competitorNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) => (c && typeof c === "object" && typeof c.name === "string" ? [c.name] : []));
}
