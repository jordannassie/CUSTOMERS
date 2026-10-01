import type { ProviderId } from "./providers/types";
import {
  DAY_MS,
  SCORE_WINDOW_DAYS,
  TREND_DAYS,
  checksInWindow,
  estimateFor,
  groupBy,
  isRealChange,
  visibilityScore,
  type Mentioned,
  type ScoreCheck,
} from "./scoring";

// Scores over time: one point per scan and changes between periods (D-63, D-64). Pure, over saved checks.

export type ScanPoint = { date: string; score: number; margin: number };

/**
 * The 30-day score as it stood at each scan over the last `days` days, oldest first (DB-002). A UTC day's checks are
 * one scan, scored at its last check. It is the same visibility score (D-63), only read at earlier moments, so
 * `checks` must reach 30 days further back than `days`.
 */
export function scoreHistory(
  checks: ScoreCheck[],
  opts: { now: Date; models: readonly ProviderId[]; days: number },
): ScanPoint[] {
  const byDay = groupBy(checksInWindow(checks, opts.now, opts.days), (c) => c.checkedAt.toISOString().slice(0, 10));
  return [...byDay.keys()].sort().flatMap((date) => {
    const at = new Date(Math.max(...byDay.get(date)!.map((c) => c.checkedAt.getTime())));
    const { overall } = visibilityScore(checks, { now: at, models: opts.models });
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
