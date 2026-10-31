import type { ProviderId } from "@/modules/scanning";

// Per question: the last checks of each AI in order (the pips), how often AI named you over 30 days, and whether the
// latest scan of the question did better or worse than the scan before it. Pure, over saved checks only.

export type HistoryRow = { runId: string; questionId: string; provider: string; at: Date; named: boolean };
export type Trend = "up" | "down" | "same";

export type QuestionHistory = {
  /** Per AI, its last checks in the window, oldest first: true where it named you. */
  pips: Partial<Record<ProviderId, boolean[]>>;
  /** Every check of the chosen AIs in the window. */
  named: number;
  answers: number;
  /** The latest scan against the one before; null with fewer than 2 scans. */
  trend: Trend | null;
};

export const PIPS_PER_MODEL = 10;
export const HISTORY_WINDOW_DAYS = 30;
/** How far back the scan before the latest one is looked for, so a monthly scan still has one. */
export const TREND_LOOKBACK_DAYS = 62;
const DAY_MS = 86_400_000;

/** One scan of one question: how many of the AIs that answered named you. A repeat of the same AI counts once. */
function scanRate(rows: HistoryRow[]): number {
  const byAi = new Map<string, boolean>();
  for (const r of rows) byAi.set(r.provider, (byAi.get(r.provider) ?? false) || r.named);
  return [...byAi.values()].filter(Boolean).length / byAi.size;
}

export function trendOf(rows: HistoryRow[]): Trend | null {
  const runs = new Map<string, HistoryRow[]>();
  for (const r of rows) runs.set(r.runId, [...(runs.get(r.runId) ?? []), r]);
  const latestAt = (list: HistoryRow[]) => Math.max(...list.map((r) => r.at.getTime()));
  const ordered = [...runs.values()].sort((a, b) => latestAt(b) - latestAt(a));
  if (ordered.length < 2) return null;
  const d = scanRate(ordered[0]) - scanRate(ordered[1]);
  return Math.abs(d) < 1e-9 ? "same" : d > 0 ? "up" : "down";
}

export function questionHistory(
  rows: HistoryRow[],
  opts: { now: Date; models: readonly ProviderId[]; last?: number; windowDays?: number },
): Map<string, QuestionHistory> {
  const since = opts.now.getTime() - (opts.windowDays ?? HISTORY_WINDOW_DAYS) * DAY_MS;
  const chosen = rows.filter((r) => (opts.models as readonly string[]).includes(r.provider) && r.at.getTime() <= opts.now.getTime());
  const byQuestion = new Map<string, HistoryRow[]>();
  for (const r of chosen) byQuestion.set(r.questionId, [...(byQuestion.get(r.questionId) ?? []), r]);

  const out = new Map<string, QuestionHistory>();
  for (const [questionId, list] of byQuestion) {
    const recent = list.filter((r) => r.at.getTime() > since).sort((a, b) => a.at.getTime() - b.at.getTime());
    const pips: QuestionHistory["pips"] = {};
    for (const model of opts.models) {
      const mine = recent.filter((r) => r.provider === model).map((r) => r.named);
      if (mine.length) pips[model] = mine.slice(-(opts.last ?? PIPS_PER_MODEL));
    }
    out.set(questionId, {
      pips,
      named: recent.filter((r) => r.named).length,
      answers: recent.length,
      trend: trendOf(list),
    });
  }
  return out;
}
