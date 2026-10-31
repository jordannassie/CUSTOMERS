// The Competitors leaderboard table (dashboard redesign, 2026-10-27): rank, the top likely reason under each name,
// the score with its last 10 scans as a sparkline, the weekly change, each AI tool's score, the standing and a link to
// Compare. Built from the same score report and reason panels as the rest of the page. Pure.
import type { ProviderId, ScoreReport } from "@/modules/scanning";
import { colorAt, colorOrder, competitorColor } from "@/lib/series-colors";
import { namedAs, rowName, trackedNote } from "./chain";
import { placeAmongTracked } from "./rank";
import type { CompetitorsView, LeaderRow } from "./service";
import type { WhyPanel } from "./why/service";

export const SPARK_SCANS = 10;
export const TABLE_MODELS: { id: ProviderId; label: string }[] = [
  { id: "openai", label: "ChatGPT" },
  { id: "anthropic", label: "Claude" },
  { id: "perplexity", label: "Perplexity" },
];

export type TableRow = {
  /** 1 for the highest score; null while a score is pending or still collecting. */
  rank: number | null;
  name: string;
  isYou: boolean;
  note: string | null;
  topReason: string | null;
  score: number | null;
  /** Each scan's own share of answers naming them, oldest first, at most SPARK_SCANS. */
  spark: (number | null)[];
  change: LeaderRow["change"];
  /** False when there is no week-ago score to compare with yet. */
  changeKnown: boolean;
  /** Each AI tool's 30-day score; null without checks, undefined when the business doesn't use that tool. */
  byModel: Partial<Record<ProviderId, number | null>>;
  standing: LeaderRow["standing"];
  collecting: boolean;
  competitorId: string | null;
  /** The business's color on every chart (lib/series-colors). */
  color: string;
  /** A competitor's known website (typed by the user or cited by AI, D-85), for its icon; null for you and unknown. */
  domain: string | null;
};

export type TableKpis = {
  /** "#3 of 5 tracked businesses", you included. */
  rank: { place: number; of: number } | null;
  /** standing is yours against them: "about_same" when the gap is inside the margin of error. */
  leader: { name: string; score: number; isYou: boolean; standing: LeaderRow["standing"] } | null;
  /** Points between you and the leader; 0 when you lead. */
  gap: number | null;
  /** The business just above you, and the points to pass it. */
  next: { name: string; points: number; standing: LeaderRow["standing"] } | null;
};

const round = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n));

export function leaderTable(view: CompetitorsView, report: ScoreReport, panels: WhyPanel[]): { rows: TableRow[]; kpis: TableKpis } {
  const charts = report.charts;
  const indexOf = (row: LeaderRow) => (row.isYou ? 0 : (charts?.names.indexOf(row.name) ?? -1));
  const ranked = view.leaderboard.filter((r) => r.score !== null && !r.collecting);
  const order = colorOrder(view.leaderboard);
  const rows = view.leaderboard.map((row) => {
    const at = indexOf(row);
    const panel = row.isYou ? undefined : panels.find((p) => p.trackedName === row.name || row.chain?.tracked.includes(p.trackedName));
    const place = ranked.indexOf(row);
    return {
      rank: place >= 0 ? place + 1 : null,
      name: row.isYou ? row.name : rowName(row),
      isYou: row.isYou,
      note: trackedNote(row),
      topReason: row.standing === "behind" ? (panel?.why.reasons[0]?.title ?? null) : row.standing === "ahead" ? (panel?.why.youLead[0]?.title ?? null) : null,
      score: row.score,
      spark: charts && at >= 0 ? charts.timeline.slice(-SPARK_SCANS).map((p) => round(p.scores[at])) : [],
      change: row.change,
      changeKnown: row.changeKnown ?? false,
      byModel: Object.fromEntries((charts?.byModel ?? []).map((m) => [m.model, at >= 0 ? round(m.scores[at]) : null])),
      standing: row.standing,
      collecting: row.collecting,
      competitorId: panel?.competitorId ?? null,
      color: row.isYou ? colorAt(0) : competitorColor(order, row.name),
      domain: row.isYou ? null : (panel?.website?.domain ?? null),
    };
  });
  return { rows, kpis: kpisOf(view.leaderboard) };
}

function kpisOf(rows: LeaderRow[]): TableKpis {
  const place = placeAmongTracked(rows);
  const you = rows.find((r) => r.isYou);
  if (!place || !you) return { rank: null, leader: null, gap: null, next: null };
  const leader = place.leader ?? you;
  const above = place.above;
  return {
    rank: { place: place.place, of: place.of },
    leader: { name: leader.isYou ? leader.name : namedAs(leader), score: leader.score!, isYou: leader.isYou, standing: leader.isYou ? null : leader.standing },
    gap: leader.score! - you.score!,
    next: above ? { name: namedAs(above), points: above.score! - you.score!, standing: above.standing } : null,
  };
}
