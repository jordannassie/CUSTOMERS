import type { ProviderId } from "./providers/types";

// Visibility score and confidence (MVP_SPEC 5.6, D-63 to D-65). Pure functions over saved checks.

export const SCORE_WINDOW_DAYS = 30;
export const TREND_DAYS = 7;
const DAY_MS = 86_400_000;
// 95% interval.
const Z = 1.96;

export type ScoreCheck = {
  provider: ProviderId;
  /** The question cluster: questions differ in difficulty, so the margin is computed per question. */
  questionId: string;
  checkedAt: Date;
  mentioned: boolean;
  competitorsMentioned: string[];
  /** Checks sharing a key saw the same answer and count once for confidence (D-64). */
  answerKey: string;
};

export type Estimate = {
  /** 0 to 100, unrounded. */
  score: number;
  /** Plus or minus this many points. */
  margin: number;
  checks: number;
  uniqueAnswers: number;
};

export type Confidence = "early" | "good" | "high";

export type Standing = "ahead" | "behind" | "about_same";

type Mentioned = (check: ScoreCheck) => boolean;

type Stats = Estimate & { variance: number };

export function checksInWindow<T extends { checkedAt: Date }>(checks: T[], now: Date, days = SCORE_WINDOW_DAYS): T[] {
  const since = now.getTime() - days * DAY_MS;
  return checks.filter((c) => c.checkedAt.getTime() > since && c.checkedAt.getTime() <= now.getTime());
}

export function confidenceLabel(uniqueAnswers: number): Confidence {
  if (uniqueAnswers < 50) return "early";
  return uniqueAnswers <= 200 ? "good" : "high";
}

export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

// Score over all checks; variance stratified by question over unique answers only.
function modelStats(checks: ScoreCheck[], mentioned: Mentioned): Stats | null {
  if (checks.length === 0) return null;
  let mentions = 0;
  let variance = 0;
  let uniqueAnswers = 0;
  for (const cluster of groupBy(checks, (c) => c.questionId).values()) {
    mentions += cluster.filter(mentioned).length;
    const unique = [...groupBy(cluster, (c) => c.answerKey).values()].map((same) => same[0]);
    uniqueAnswers += unique.length;
    // Adding one hit and one miss keeps a cluster with a single answer from claiming zero spread.
    const p = (unique.filter(mentioned).length + 1) / (unique.length + 2);
    const weight = cluster.length / checks.length;
    variance += (weight * weight * p * (1 - p)) / unique.length;
  }
  const score = (100 * mentions) / checks.length;
  return {
    score,
    margin: Z * 100 * Math.sqrt(variance),
    checks: checks.length,
    uniqueAnswers,
    variance,
  };
}

function strip(stats: Stats): Estimate {
  return {
    score: stats.score,
    margin: stats.margin,
    checks: stats.checks,
    uniqueAnswers: stats.uniqueAnswers,
  };
}

/** Per model estimates and their equal-weight average (D-65). Null overall when no chosen model has a check. */
function estimateFor(checks: ScoreCheck[], models: readonly ProviderId[], mentioned: Mentioned) {
  const byModel = new Map<ProviderId, Stats>();
  for (const model of models) {
    const stats = modelStats(
      checks.filter((c) => c.provider === model),
      mentioned,
    );
    if (stats) byModel.set(model, stats);
  }
  const all = [...byModel.values()];
  if (all.length === 0) return { overall: null, byModel };
  const n = all.length;
  const overall: Estimate = {
    score: all.reduce((sum, s) => sum + s.score, 0) / n,
    margin: (Z * 100 * Math.sqrt(all.reduce((sum, s) => sum + s.variance, 0))) / n,
    checks: all.reduce((sum, s) => sum + s.checks, 0),
    uniqueAnswers: all.reduce((sum, s) => sum + s.uniqueAnswers, 0),
  };
  return { overall, byModel };
}

export type VisibilityScore = {
  overall: (Estimate & { confidence: Confidence }) | null;
  byModel: { model: ProviderId; estimate: Estimate }[];
};

/** Mentions divided by checks over the last 30 days, per chosen model and overall. */
export function visibilityScore(
  checks: ScoreCheck[],
  opts: { now: Date; models: readonly ProviderId[] },
): VisibilityScore {
  const { overall, byModel } = estimateFor(checksInWindow(checks, opts.now), opts.models, (c) => c.mentioned);
  return {
    overall: overall ? { ...overall, confidence: confidenceLabel(overall.uniqueAnswers) } : null,
    byModel: opts.models.flatMap((model) => {
      const stats = byModel.get(model);
      return stats ? [{ model, estimate: strip(stats) }] : [];
    }),
  };
}

export type TrendPoint = { date: string; score: number | null; checks: number };

/** One point per UTC day for the last 7 days, oldest first; null on a day with no checks. */
export function trendSeries(checks: ScoreCheck[], opts: { now: Date; models: readonly ProviderId[] }): TrendPoint[] {
  const today = Date.UTC(opts.now.getUTCFullYear(), opts.now.getUTCMonth(), opts.now.getUTCDate());
  const byDay = groupBy(checks, (c) => c.checkedAt.toISOString().slice(0, 10));
  return Array.from({ length: TREND_DAYS }, (_, i) => {
    const date = new Date(today - (TREND_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    const { overall } = estimateFor(byDay.get(date) ?? [], opts.models, (c) => c.mentioned);
    return {
      date,
      score: overall?.score ?? null,
      checks: overall?.checks ?? 0,
    };
  });
}

export type ScanPoint = { date: string; score: number; margin: number };

/** The estimate of each UTC day with checks, oldest first. A day's checks are one scan, so this is the score per scan. */
export function scanSeries(checks: ScoreCheck[], opts: { now: Date; models: readonly ProviderId[] }): ScanPoint[] {
  const byDay = groupBy(checksInWindow(checks, opts.now), (c) => c.checkedAt.toISOString().slice(0, 10));
  return [...byDay.keys()].sort().flatMap((date) => {
    const { overall } = estimateFor(byDay.get(date)!, opts.models, (c) => c.mentioned);
    return overall ? [{ date, score: overall.score, margin: overall.margin }] : [];
  });
}

/** True only when the gap is larger than the margin of the two estimates together. */
export function isRealChange(a: Pick<Estimate, "score" | "margin">, b: Pick<Estimate, "score" | "margin">): boolean {
  return Math.abs(a.score - b.score) > Math.hypot(a.margin, b.margin);
}

/** Where you stand against a competitor: "ahead" means you are mentioned more, by more than the margin. */
export function compareWithCompetitor(
  you: Pick<Estimate, "score" | "margin">,
  them: Pick<Estimate, "score" | "margin">,
): Standing {
  if (!isRealChange(you, them)) return "about_same";
  return you.score > them.score ? "ahead" : "behind";
}

export type CompetitorScore = {
  name: string;
  estimate: Estimate;
  standing: Standing;
};

/** Each competitor's mention rate on the same checks, compared with yours. Empty when you have no score yet. */
export function competitorScores(
  checks: ScoreCheck[],
  competitors: string[],
  opts: { now: Date; models: readonly ProviderId[] },
): CompetitorScore[] {
  const inWindow = checksInWindow(checks, opts.now);
  const you = estimateFor(inWindow, opts.models, (c) => c.mentioned).overall;
  if (!you) return [];
  return competitors.map((name) => {
    const lower = name.toLowerCase();
    const mentioned: Mentioned = (c) => c.competitorsMentioned.some((n) => n.toLowerCase() === lower);
    const them = estimateFor(inWindow, opts.models, mentioned).overall!;
    return { name, estimate: them, standing: compareWithCompetitor(you, them) };
  });
}

export type Change = { direction: "up" | "down"; points: number };

/**
 * The last 7 days against the 7 days before, so the two estimates share no checks.
 * Null unless both weeks have checks and the gap is larger than the margin (D-64).
 */
export function weeklyChange(checks: ScoreCheck[], opts: { now: Date; models: readonly ProviderId[] }): Change | null {
  const lastWeek = new Date(opts.now.getTime() - TREND_DAYS * DAY_MS);
  const recent = estimateFor(checksInWindow(checks, opts.now, TREND_DAYS), opts.models, (c) => c.mentioned).overall;
  const before = estimateFor(checksInWindow(checks, lastWeek, TREND_DAYS), opts.models, (c) => c.mentioned).overall;
  if (!recent || !before || !isRealChange(recent, before)) return null;
  const points = recent.score - before.score;
  return { direction: points > 0 ? "up" : "down", points: Math.abs(points) };
}
