// The Competitors page charts (2026-10-23): each business over time, share of voice, and by AI model. The same
// checks and the same 30-day mention rate as the leaderboard (D-63, D-65), so a line ends where that business's
// leaderboard score is. Pure.
import type { ProviderId } from "./providers/types";
import { checksInWindow, estimateFor, groupBy, SCORE_WINDOW_DAYS, type Mentioned, type ScoreCheck } from "./scoring";

export type CompetitorCharts = {
  /** Index 0 is you, then each competitor in the order given. Every `scores` array follows this order. */
  names: string[];
  /** One point per scan day in the last 30 days: each business's 30-day score as it stood at that scan. */
  timeline: { date: string; scores: (number | null)[] }[];
  /** Answers in the last 30 days that named each business, and its share of all those namings (0 to 100). */
  share: { mentions: number; share: number }[];
  /** Each business's 30-day score on one model; null where that model has no checks. */
  byModel: { model: ProviderId; scores: (number | null)[] }[];
};

/**
 * `checks` must reach 30 days before the oldest scan shown, like scoreHistory, so each point is a full window.
 * Competitor names match the way competitorScores matches them: the name as tracked, any case.
 */
export function competitorCharts(
  checks: ScoreCheck[],
  you: string,
  competitors: string[],
  opts: { now: Date; models: readonly ProviderId[] },
): CompetitorCharts {
  const named = (name: string): Mentioned => {
    const lower = name.toLowerCase();
    return (c) => c.competitorsMentioned.some((n) => n.toLowerCase() === lower);
  };
  const mentioned: Mentioned[] = [(c) => c.mentioned, ...competitors.map(named)];
  const scoreOf = (inWindow: ScoreCheck[], models: readonly ProviderId[], m: Mentioned) => estimateFor(inWindow, models, m).overall?.score ?? null;

  const byDay = groupBy(checksInWindow(checks, opts.now, SCORE_WINDOW_DAYS), (c) => c.checkedAt.toISOString().slice(0, 10));
  const timeline = [...byDay.keys()].sort().map((date) => {
    const at = new Date(Math.max(...byDay.get(date)!.map((c) => c.checkedAt.getTime())));
    const inWindow = checksInWindow(checks, at);
    return { date, scores: mentioned.map((m) => scoreOf(inWindow, opts.models, m)) };
  });

  const now = checksInWindow(checks, opts.now).filter((c) => opts.models.includes(c.provider));
  const mentions = mentioned.map((m) => now.filter(m).length);
  const total = mentions.reduce((sum, n) => sum + n, 0);

  return {
    names: [you, ...competitors],
    timeline,
    share: mentions.map((n) => ({ mentions: n, share: total > 0 ? (100 * n) / total : 0 })),
    byModel: opts.models.map((model) => ({ model, scores: mentioned.map((m) => scoreOf(now, [model], m)) })),
  };
}
