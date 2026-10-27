// The Overview's competitor blocks (dashboard redesign, 2026-10-27): where you stand, your share of AI picks, each AI
// tool's leaders, the per-scan chart against the leader, and the period counts behind the KPI strip. Pure, from the
// same score report and leaderboard as the Competitors page.
import type { ProviderId, ScoreReport } from "@/modules/scanning";
import { rowName } from "./chain";
import type { CompetitorsView, LeaderRow } from "./service";

const STAND_ROWS = 4;
/** Competitors drawn on the Overview chart besides you: five lines in all, each its own color. */
const MAX_LINES = 4;
const LABELS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
const round = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n));

export type OverviewCompete = {
  /** Up to 4 businesses by score, you always among them. */
  stand: { name: string; isYou: boolean; score: number; standing: LeaderRow["standing"] }[];
  /** Your share of every naming of you or a tracked competitor, and your place by namings. */
  share: { percent: number; rank: number; of: number } | null;
  /** "Pizza Hut 75 · Domino's 15": the two competitors each AI tool named most. */
  modelContext: Partial<Record<ProviderId, string>>;
  /** You, then up to 4 competitors by score; `key` is the timeline's field for each. */
  lines: { key: string; name: string; isYou: boolean; latest: number | null }[];
  /** Each scan's own rate for every line (s0 is you), and your 30-day score then (rolling, dashed). */
  timeline: ({ label: string; rolling: number | null } & Record<string, number | string | null>)[];
  leaderName: string | null;
  period: { days: number; answers: number; named: number; prevAnswers: number; prevNamed: number } | null;
};

const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function overviewCompete(view: CompetitorsView, report: ScoreReport): OverviewCompete {
  const charts = report.charts ?? null;
  const ranked = view.leaderboard.filter((r) => r.score !== null && !r.collecting);
  const top = ranked.slice(0, STAND_ROWS);
  const you = ranked.find((r) => r.isYou);
  const stand = (you && !top.includes(you) ? [...top.slice(0, STAND_ROWS - 1), you] : top).map((r) => ({
    name: r.isYou ? r.name : rowName(r),
    isYou: r.isYou,
    score: r.score!,
    standing: r.standing,
  }));
  const leader = ranked.find((r) => !r.isYou) ?? null;
  const shown = ranked.filter((r) => !r.isYou).slice(0, MAX_LINES);
  const at = (r: LeaderRow) => (r.isYou ? 0 : (charts?.names.indexOf(r.name) ?? -1));
  const lineRows = [...(you ? [you] : []), ...shown].filter((r) => at(r) >= 0);
  const lastScan = charts?.timeline.at(-1);
  const lines = lineRows.map((r, i) => ({
    key: `s${i}`,
    name: r.isYou ? r.name : rowName(r),
    isYou: r.isYou,
    latest: lastScan ? round(lastScan.scores[at(r)]) : null,
  }));

  let share: OverviewCompete["share"] = null;
  if (charts) {
    const order = charts.share.map((s, i) => ({ i, n: s.mentions })).sort((a, b) => b.n - a.n || a.i - b.i);
    const total = charts.share.reduce((sum, s) => sum + s.mentions, 0);
    if (total > 0) share = { percent: Math.round(charts.share[0].share), rank: order.findIndex((o) => o.i === 0) + 1, of: charts.share.length };
  }

  const modelContext: OverviewCompete["modelContext"] = {};
  for (const m of charts?.byModel ?? []) {
    const named = m.scores
      .map((score, i) => ({ score: round(score), name: charts!.names[i], i }))
      .filter((x) => x.i > 0 && x.score !== null)
      .sort((a, b) => b.score! - a.score!)
      .slice(0, 2);
    if (named.length > 0) modelContext[m.model] = named.map((x) => `${x.name} ${x.score}`).join(" · ");
  }

  return {
    stand,
    share,
    modelContext,
    lines,
    timeline: (charts?.timeline ?? []).map((p) => ({
      label: dayLabel(p.date),
      rolling: round(p.rolling[0]),
      ...Object.fromEntries(lineRows.map((r, i) => [`s${i}`, round(p.scores[at(r)])])),
    })),
    leaderName: leader ? rowName(leader) : null,
    period: charts?.period
      ? { days: charts.period.days, answers: charts.period.answers, named: charts.period.named[0], prevAnswers: charts.period.prevAnswers, prevNamed: charts.period.prevNamed[0] }
      : null,
  };
}

export const modelLabel = (id: string) => LABELS[id] ?? id;
