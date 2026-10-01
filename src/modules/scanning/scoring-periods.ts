import type { ProviderId } from "./providers/types";
import {
  DAY_MS,
  SCORE_WINDOW_DAYS,
  TREND_DAYS,
  checksInWindow,
  estimateFor,
  groupBy,
  isRealChange,
  type Mentioned,
  type ScoreCheck,
} from "./scoring";

// Scores over time: one point per scan and changes between periods (D-63, D-64). Pure, over saved checks.

export type ScanPoint = { date: string; score: number; margin: number };

/** The estimate of each UTC day with checks, oldest first. A day's checks are one scan, so this is the score per scan. */
export function scanSeries(checks: ScoreCheck[], opts: { now: Date; models: readonly ProviderId[] }): ScanPoint[] {
  const byDay = groupBy(checksInWindow(checks, opts.now), (c) => c.checkedAt.toISOString().slice(0, 10));
  return [...byDay.keys()].sort().flatMap((date) => {
    const { overall } = estimateFor(byDay.get(date)!, opts.models, (c) => c.mentioned);
    return overall ? [{ date, score: overall.score, margin: overall.margin }] : [];
  });
}

export type Change = { direction: "up" | "down"; points: number };

/**
 * The last 7 days against the 7 days before, so the two estimates share no checks.
 * Null unless both weeks have checks and the gap is larger than the margin (D-64).
 */
export function weeklyChange(checks: ScoreCheck[], opts: { now: Date; models: readonly ProviderId[] }): Change | null {
  return periodChange(checks, opts, TREND_DAYS);
}

/** The last 30 days against the 30 before, for the client report (DB-012). Same rule as the weekly change. */
export function monthlyChange(checks: ScoreCheck[], opts: { now: Date; models: readonly ProviderId[] }): Change | null {
  return periodChange(checks, opts, SCORE_WINDOW_DAYS);
}

/** Each model's own weekly change, by the same rule as the overall one (DB-013). */
export function modelWeeklyChanges(
  checks: ScoreCheck[],
  opts: { now: Date; models: readonly ProviderId[] },
): Partial<Record<ProviderId, Change>> {
  const changes: Partial<Record<ProviderId, Change>> = {};
  for (const model of opts.models) {
    const change = periodChange(checks, { now: opts.now, models: [model] }, TREND_DAYS);
    if (change) changes[model] = change;
  }
  return changes;
}

/** A competitor's weekly change in how often AI named it (DB-013). */
export function competitorWeeklyChange(
  checks: ScoreCheck[],
  name: string,
  opts: { now: Date; models: readonly ProviderId[] },
): Change | null {
  const lower = name.toLowerCase();
  return periodChange(checks, opts, TREND_DAYS, (c) => c.competitorsMentioned.some((n) => n.toLowerCase() === lower));
}

function periodChange(
  checks: ScoreCheck[],
  opts: { now: Date; models: readonly ProviderId[] },
  days: number,
  mentioned: Mentioned = (c) => c.mentioned,
): Change | null {
  const before = new Date(opts.now.getTime() - days * DAY_MS);
  const recentEstimate = estimateFor(checksInWindow(checks, opts.now, days), opts.models, mentioned).overall;
  const beforeEstimate = estimateFor(checksInWindow(checks, before, days), opts.models, mentioned).overall;
  if (!recentEstimate || !beforeEstimate || !isRealChange(recentEstimate, beforeEstimate)) return null;
  const points = recentEstimate.score - beforeEstimate.score;
  return { direction: points > 0 ? "up" : "down", points: Math.abs(points) };
}
