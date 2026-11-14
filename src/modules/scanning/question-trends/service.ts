// Up or down per question (2026-10-13): for each active question, how many of the AI tools named the business at each
// of the last 6 weekly scans, and the questions that moved most over 4 weeks. Saved checks only, no AI calls. Pure.
//
// One scan stands for each week (weeklyScans). A failed check has no saved row, so "x of n" counts only the AIs that
// answered.

import { averagePlace, placeOf, type AveragePlace, type Place } from "./places";

export const TREND_WEEKS = 6;
export const MOVER_DAYS = 28;
export const MAX_MOVERS = 3;
/** How far back "the scan before" is looked for: the Questions page's TREND_LOOKBACK_DAYS (questions/history.ts). */
const PREVIOUS_SCAN_LOOKBACK_DAYS = 62;
// The average place covers the same 30 days as the score.
const PLACE_DAYS = 30;
// Scans at least this far apart are different weeks.
const MIN_GAP_MS = 6 * 86_400_000;

export type TrendQuestion = { id: string; prompt: string; own: boolean };
export type TrendRun = { id: string; at: Date };
export type TrendCheck = { runId: string; promptId: string; provider: string; named: boolean; position?: number | null };

export type Tally = { named: number; checked: number };
export type TrendCell = (Tally & { change: "up" | "down" | "same" | null }) | null;
/** place: only with SHOW_POSITION, where AI named the business at the newest scan (D-63). */
export type TrendRow = TrendQuestion & { cells: TrendCell[]; place?: Place | null };
export type Mover = TrendQuestion & { now: Tally; then: Tally; thenAt: Date; change: number };

export type QuestionTrends = {
  /** The weekly scans shown, oldest first. */
  scans: TrendRun[];
  /** Suggested questions, the ones the score counts. */
  rows: TrendRow[];
  /** The user's own questions, shown apart like the score does (BUG-129). */
  own: TrendRow[];
  /** Some question has a scan before its latest one, so "moved" can be judged at all. */
  comparable: boolean;
  better: Mover[];
  worse: Mover[];
  /** Only with SHOW_POSITION: the average list item over the last 30 days' weekly scans, suggested questions. */
  averagePlace?: AveragePlace | null;
};

const rate = (t: Tally) => t.named / t.checked;

/**
 * One scan per week, newest first back: the latest scan, then the next one at least 6 days older, and so on, the last
 * `weeks` of them oldest first. A rescan the same week gives way to the latest one, daily scans show about weekly,
 * and weekly scans that run a little earlier than 7 days later stay apart.
 */
export function weeklyScans(runs: TrendRun[], weeks = TREND_WEEKS): TrendRun[] {
  const sorted = [...runs].sort((a, b) => b.at.getTime() - a.at.getTime());
  const picked: TrendRun[] = [];
  for (const run of sorted) {
    if (picked.length === weeks) break;
    const last = picked.at(-1);
    if (!last || last.at.getTime() - run.at.getTime() >= MIN_GAP_MS) picked.push(run);
  }
  return picked.reverse();
}

function tally(checks: TrendCheck[]): Tally | null {
  // One check per AI per question per scan; a repeat of the same AI counts once.
  const byProvider = new Map<string, boolean>();
  for (const c of checks) byProvider.set(c.provider, (byProvider.get(c.provider) ?? false) || c.named);
  if (byProvider.size === 0) return null;
  return { named: [...byProvider.values()].filter(Boolean).length, checked: byProvider.size };
}

function direction(now: Tally, before: Tally | null): "up" | "down" | "same" | null {
  if (!before) return null;
  const d = rate(now) - rate(before);
  return Math.abs(d) < 1e-9 ? "same" : d > 0 ? "up" : "down";
}

export function questionTrends(
  questions: TrendQuestion[],
  runs: TrendRun[],
  checks: TrendCheck[],
  now: Date,
  options: { places?: boolean } = {},
): QuestionTrends {
  const asked = new Set(questions.map((q) => q.id));
  const counted = checks.filter((c) => asked.has(c.promptId));
  const withAnswers = new Set(counted.map((c) => c.runId));
  const scans = weeklyScans(runs.filter((r) => withAnswers.has(r.id)));

  const key = (runId: string, promptId: string) => `${runId}\u0000${promptId}`;
  const grouped = new Map<string, TrendCheck[]>();
  for (const c of counted) grouped.set(key(c.runId, c.promptId), [...(grouped.get(key(c.runId, c.promptId)) ?? []), c]);

  const rowOf = (q: TrendQuestion): TrendRow => {
    const tallies = scans.map((s) => tally(grouped.get(key(s.id, q.id)) ?? []));
    const cells = tallies.map((t, i) => (t ? { ...t, change: direction(t, tallies[i - 1] ?? null) } : null));
    if (!options.places) return { ...q, cells };
    const newest = scans.at(-1);
    return { ...q, cells, place: newest ? placeOf(grouped.get(key(newest.id, q.id)) ?? []) : null };
  };
  const all = questions.map(rowOf);

  // Each question's latest scan against the scan before it, the same rule as the Questions page's up and down arrows
  // (questions/history.ts trendOf), so the two never disagree (MVP test, 2026-11-14). Every scan counts here, not one
  // per week, and the scan before is looked for as far back as the Questions page looks.
  const since = now.getTime() - PREVIOUS_SCAN_LOOKBACK_DAYS * 86_400_000;
  const runAt = new Map(runs.map((r) => [r.id, r.at]));
  const movers: Mover[] = [];
  let comparable = false;
  for (const q of questions) {
    const scansOfQuestion = [...new Set(counted.filter((c) => c.promptId === q.id).map((c) => c.runId))]
      .flatMap((id) => {
        const at = runAt.get(id);
        return at && at.getTime() >= since ? [{ id, at }] : [];
      })
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    if (scansOfQuestion.length < 2) continue;
    comparable = true;
    const before = scansOfQuestion[scansOfQuestion.length - 2];
    const latest = scansOfQuestion[scansOfQuestion.length - 1];
    const then = tally(grouped.get(key(before.id, q.id)) ?? []);
    const nowTally = tally(grouped.get(key(latest.id, q.id)) ?? []);
    if (!then || !nowTally) continue;
    const change = rate(nowTally) - rate(then);
    if (Math.abs(change) < 1e-9) continue;
    movers.push({ id: q.id, prompt: q.prompt, own: q.own, now: nowTally, then, thenAt: before.at, change });
  }
  const byPrompt = (a: Mover, b: Mover) => a.prompt.localeCompare(b.prompt);

  const recent = new Set(scans.filter((s) => s.at.getTime() >= now.getTime() - PLACE_DAYS * 86_400_000).map((s) => s.id));
  const scored = new Set(questions.filter((q) => !q.own).map((q) => q.id));
  return {
    ...(options.places ? { averagePlace: averagePlace(counted.filter((c) => recent.has(c.runId) && scored.has(c.promptId))) } : {}),
    scans,
    rows: all.filter((r) => !r.own),
    own: all.filter((r) => r.own),
    comparable,
    better: movers.filter((m) => m.change > 0).sort((a, b) => b.change - a.change || byPrompt(a, b)).slice(0, MAX_MOVERS),
    worse: movers.filter((m) => m.change < 0).sort((a, b) => a.change - b.change || byPrompt(a, b)).slice(0, MAX_MOVERS),
  };
}
