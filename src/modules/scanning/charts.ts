// The Competitors page charts (2026-10-23): each business over time, share of voice, and by AI model. The same
// checks and the same 30-day mention rate as the leaderboard (D-63, D-91), so a line ends where that business's
// leaderboard score is. Pure.
import type { ProviderId } from "./providers/types";
import { checksInWindow, DAY_MS, estimateFor, groupBy, SCORE_WINDOW_DAYS, type Mentioned, type ScoreCheck } from "./scoring";

export type CompetitorCharts = {
  /** Index 0 is you, then each competitor in the order given. Every `scores` array follows this order. */
  names: string[];
  /**
   * One point per scan day in the last `days` days (30 by default). `scores`: that scan's own hit rate, the share of
   * that day's answers naming each business, so the line moves with real answers. `rolling`: the 30-day score as it
   * stood at that scan (D-63), drawn as the dashed reference.
   */
  timeline: { date: string; scores: (number | null)[]; rolling: (number | null)[] }[];
  /** Answers in the last 30 days that named each business, and its share of all those namings (0 to 100). */
  share: { mentions: number; share: number }[];
  /** Each business's 30-day score on one model; null where that model has no checks. */
  byModel: { model: ProviderId; scores: (number | null)[] }[];
  /**
   * Answers in the last `days` days and the `days` before them, and how many named each business (same order as
   * `names`). The Overview's 7, 30 or 90 day counts and their change; the score itself stays the 30-day one (D-63).
   */
  period: { days: number; answers: number; named: number[]; prevAnswers: number; prevNamed: number[] };
};

/**
 * `checks` must reach 30 days before the oldest scan shown, like scoreHistory, so each point is a full window.
 * Competitor names match the way competitorScores matches them: the name as tracked, any case.
 */
export function competitorCharts(
  checks: ScoreCheck[],
  you: string,
  competitors: string[],
  opts: { now: Date; models: readonly ProviderId[]; days?: number },
): CompetitorCharts {
  const named = (name: string): Mentioned => {
    const lower = name.toLowerCase();
    return (c) => c.competitorsMentioned.some((n) => n.toLowerCase() === lower);
  };
  const mentioned: Mentioned[] = [(c) => c.mentioned, ...competitors.map(named)];
  const scoreOf = (inWindow: ScoreCheck[], models: readonly ProviderId[], m: Mentioned) => estimateFor(inWindow, models, m).overall?.score ?? null;

  const byDay = groupBy(checksInWindow(checks, opts.now, opts.days ?? SCORE_WINDOW_DAYS), (c) => c.checkedAt.toISOString().slice(0, 10));
  const timeline = [...byDay.keys()].sort().map((date) => {
    const day = byDay.get(date)!;
    const at = new Date(Math.max(...day.map((c) => c.checkedAt.getTime())));
    const inWindow = checksInWindow(checks, at);
    return {
      date,
      scores: mentioned.map((m) => scoreOf(day, opts.models, m)),
      rolling: mentioned.map((m) => scoreOf(inWindow, opts.models, m)),
    };
  });

  const now = checksInWindow(checks, opts.now).filter((c) => opts.models.includes(c.provider));
  const mentions = mentioned.map((m) => now.filter(m).length);
  const total = mentions.reduce((sum, n) => sum + n, 0);

  const days = opts.days ?? SCORE_WINDOW_DAYS;
  const chosen = (list: ScoreCheck[]) => list.filter((c) => opts.models.includes(c.provider));
  const current = chosen(checksInWindow(checks, opts.now, days));
  const before = chosen(checksInWindow(checks, new Date(opts.now.getTime() - days * DAY_MS), days));

  return {
    period: {
      days,
      answers: current.length,
      named: mentioned.map((m) => current.filter(m).length),
      prevAnswers: before.length,
      prevNamed: mentioned.map((m) => before.filter(m).length),
    },
    names: [you, ...competitors],
    timeline,
    share: mentions.map((n) => ({ mentions: n, share: total > 0 ? (100 * n) / total : 0 })),
    byModel: opts.models.map((model) => ({ model, scores: mentioned.map((m) => scoreOf(now, [model], m)) })),
  };
}
