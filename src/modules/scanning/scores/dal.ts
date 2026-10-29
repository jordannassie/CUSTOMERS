import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { requestNow } from "@/lib/request-now";
import { requireAgency } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { loadChains, loadOwnChain } from "../chains/dal";
import type { ProviderId } from "../providers/types";
import {
  SCORE_WINDOW_DAYS,
  TREND_DAYS,
  competitorScores,
  trendSeries,
  visibilityScore,
  type ScoreCheck,
} from "../scoring";
import { competitorCharts } from "../charts";
import {
  competitorWeeklyChange,
  modelMonthlyChanges,
  modelWeeklyChanges,
  monthlyChange,
  scoreHistory,
  weeklyChange,
} from "../scoring-periods";
import { ownQuestionsResult, splitByQuestion } from "./counted";
import type { ScoreReport } from "./report";

export type { ScoreReport } from "./report";
import { questionAppearances, questionAppearancesByModel, type ModelAppearance } from "./questions";

// 30-day score aggregates (B-30 step 2) from the visibility_checks_30d view (migration 032). Only answers to active
// suggested questions count (counted.ts, BUG-129); answers to the user's own questions are summed on their own.
const PAGE = 1000;
const LAST_CHECKS_PER_QUESTION = 10;
const DAY_MS = 86_400_000;


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
    db.from("businesses").select("id, name, domain, models, primary_city").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("business_competitors").select("name, city").eq("business_id", businessId).order("name"),
    // Stopped ones too, for past scores (step 9e); the screens list the active ones only.
    db.from("tracked_prompts").select("id, prompt, source, active, inactive_since").eq("business_id", businessId).order("created_at"),
  ]);
});
const windowChecks = cache((businessId: string, sinceMs: number) => readChecks(businessId, new Date(sinceMs)));
const olderChecks = cache((businessId: string, fromMs: number, toMs: number) =>
  readOlderChecks(businessId, new Date(fromMs), new Date(toMs)),
);

export type ReportOptions = {
  /** Days before the 30-day window to read as well, for comparisons with earlier periods. */
  historyDays?: number;
  /** Also build the Competitors page charts from the same checks. */
  charts?: boolean;
  /** Days the chart timeline and period counts cover (30 by default); historyDays should reach twice this. */
  chartDays?: number;
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
  // Weekly changes compare with the 30-day score a week ago, so the week before the window is always read. Longer
  // history is a separate read of the days before that, so each stretch is read once per request.
  const weekBefore = start - TREND_DAYS * DAY_MS;
  const [windowed, lastWeek, earlier] = await Promise.all([
    windowChecks(businessId, start),
    olderChecks(businessId, weekBefore, start),
    historyDays > TREND_DAYS ? olderChecks(businessId, start - historyDays * DAY_MS, weekBefore) : [],
  ]);
  // The same rule for the window and the history before it, so a change compares like with like.
  const tracked = questions.data!.map((q) => ({ ...q, inactiveSince: q.inactive_since }));
  const split = splitByQuestion(windowed, tracked);
  const checks = split.scored;
  const all = splitByQuestion([...earlier, ...lastWeek, ...windowed], tracked, { history: true }).scored;
  const opts = { now, models };
  const rivals = competitorScores(checks, competitors.data!.map((c) => c.name), opts);
  const city = (name: string) => competitors.data!.find((c) => c.name === name)?.city ?? business.data!.primary_city;
  const b = business.data;
  const [chains, ownChain] = await Promise.all([
    loadChains(businessId, rivals.map((c) => ({ name: c.name, city: city(c.name), score: c.estimate.score })), windowStart),
    loadOwnChain(businessId, { name: b.name, city: b.primary_city, domain: b.domain }, new Set(checks.map((c) => c.questionId)), windowStart),
  ]);
  const appearances = new Map(
    questionAppearances(windowed, {
      ...opts,
      last: LAST_CHECKS_PER_QUESTION,
    }).map((a) => [a.questionId, a]),
  );
  return {
    ...visibilityScore(checks, opts),
    models,
    trend: trendSeries(checks, opts),
    history: historyDays > 0 ? scoreHistory(all, { ...opts, days: historyDays }) : [],
    change: weeklyChange(all, opts),
    modelChanges: modelWeeklyChanges(all, opts),
    modelMonthChanges: historyDays >= SCORE_WINDOW_DAYS ? modelMonthlyChanges(all, opts) : {},
    monthChange: historyDays >= SCORE_WINDOW_DAYS ? monthlyChange(all, opts) : null,
    firstCheckedAt: checks[0]?.checkedAt ?? null,
    // The last scan, whichever questions it asked.
    lastCheckedAt: windowed.at(-1)?.checkedAt ?? null,
    competitors: rivals.map((c, i) => ({
      name: c.name,
      score: c.estimate.score,
      standing: c.standing,
      change: competitorWeeklyChange(all, c.name, opts),
      chain: chains[i],
    })),
    questions: questions.data!.filter((q) => q.active).map((q) => ({
      id: q.id,
      question: q.prompt,
      appeared: appearances.get(q.id)?.appeared ?? 0,
      checks: appearances.get(q.id)?.checks ?? 0,
    })),
    ownQuestions: ownQuestionsResult(split.own, opts),
    ownChain,
    ...(options.charts ? { charts: competitorCharts(all, b.name, competitors.data!.map((c) => c.name), { ...opts, days: options.chartDays }) } : {}),
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
 * Checks older than the visibility_checks_30d view keeps, read from the rows that count (migration 044, no
 * sample answers for a real agency) and shaped the same way as migration 032: the same answer key, so an answer
 * repeated across the 30-day line still counts once.
 */
export async function readOlderChecks(businessId: string, from: Date, to: Date): Promise<ScoreCheck[]> {
  const checks: ScoreCheck[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_results_counted")
      .select("id, provider, tracked_prompt_id, created_at, business_mentioned, competitors_mentioned, answer_text")
      .eq("business_id", businessId)
      .gt("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at")
      .order("id")
      .range(start, start + PAGE - 1);
    if (error) throw new Error(`Scores: could not read older checks: ${error.message}`);
    // View columns are typed nullable, but the underlying columns are not null.
    for (const r of data) {
      checks.push({
        provider: r.provider as ProviderId,
        questionId: r.tracked_prompt_id ?? "none",
        checkedAt: new Date(r.created_at!),
        mentioned: r.business_mentioned!,
        competitorsMentioned: competitorNames(r.competitors_mentioned),
        answerKey: r.answer_text === null ? r.id! : createHash("md5").update(r.provider! + r.answer_text).digest("hex"),
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
