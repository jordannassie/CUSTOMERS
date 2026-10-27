// What the Competitors page charts show (2026-10-23), from the score report's chart data (scanning/charts.ts). You in
// the brand blue and up to three competitors in the greys, strongest darkest (DESIGN.md: charts). Pure.
import { MODEL_LABELS } from "@/modules/overview";
import type { ScoreReport } from "@/modules/scanning";
import { colorAt, competitorColor, OTHER_SERIES_COLOR } from "@/lib/series-colors";

/** A line or bar series. `key` is safe as a chart data key; names can hold any character. */
export type ChartSeries = { key: string; name: string; isYou: boolean; color: string };

export type CompetitorChartsView = {
  /** You, then the competitors with the highest scores, at most MAX_COMPETITORS. */
  series: ChartSeries[];
  /** Tracked competitors with a score that the lines and bars leave out. */
  hidden: number;
  /**
   * One row per scan: `label` for the axis, then each series key's own hit rate on that scan, and `r<key>` its 30-day
   * score as it stood then (the dashed reference). Rounded, null without checks.
   */
  timeline: ({ date: string; label: string } & Record<string, number | string | null>)[];
  /** Share of voice: the series, then "Other competitors" when hidden ones were named. Shares add up to 100. */
  share: (ChartSeries & { share: number; mentions: number })[];
  /** Answers in the last 30 days that named any of these businesses. */
  mentions: number;
  /** One row per chosen AI model, then a value per series key. */
  byModel: ({ model: string } & Record<string, number | string | null>)[];
};

export const MAX_COMPETITORS = 3;

/** Place in the leaderboard order; unknown names go last. */
const rank = (order: string[], name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
const YOU_COLOR = colorAt(0);
const OTHER_COLOR = OTHER_SERIES_COLOR;

const round = (n: number | null) => (n === null ? null : Math.round(n));
const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Null when the report has no chart data or no score yet. `scored` lists the competitors the leaderboard has a score
 * for: one added after the last scan was never looked for, so a 0 for it would be wrong.
 */
export function competitorChartsView(report: ScoreReport, scored: ReadonlySet<string>, order: string[] = []): CompetitorChartsView | null {
  const charts = report.charts;
  if (!charts || !report.overall) return null;
  const at = (i: number) => charts.share[i]?.mentions ?? 0;
  const ranked = charts.names
    .map((name, index) => ({ name, index, score: report.competitors.find((c) => c.name === name)?.score ?? -1 }))
    .slice(1)
    .filter((c) => scored.has(c.name))
    // The leaderboard's order when given, so each business keeps the color it has on every other page.
    .sort((a, b) => rank(order, a.name) - rank(order, b.name) || b.score - a.score || a.name.localeCompare(b.name));
  const shown = ranked.slice(0, MAX_COMPETITORS);
  const series: (ChartSeries & { index: number })[] = [
    { key: "s0", name: charts.names[0], isYou: true, color: YOU_COLOR, index: 0 },
    ...shown.map((c, i) => ({
      key: `s${i + 1}`,
      name: c.name,
      isYou: false,
      color: order.length > 0 ? competitorColor(order, c.name) : colorAt(i + 1),
      index: c.index,
    })),
  ];

  const values = (scores: (number | null)[]) => Object.fromEntries(series.map((s) => [s.key, round(scores[s.index])]));
  const others = ranked.slice(MAX_COMPETITORS).reduce((sum, c) => sum + at(c.index), 0);
  const mentions = series.reduce((sum, s) => sum + at(s.index), 0) + others;
  const shareOf = (n: number) => (mentions > 0 ? Math.round((1000 * n) / mentions) / 10 : 0);

  return {
    series: series.map((s) => ({ key: s.key, name: s.name, isYou: s.isYou, color: s.color })),
    hidden: ranked.length - shown.length,
    timeline: charts.timeline.map((p) => ({
      date: p.date,
      label: dayLabel(p.date),
      ...values(p.scores),
      ...Object.fromEntries(Object.entries(values(p.rolling)).map(([k, v]) => [`r${k}`, v])),
    })),
    share: [
      ...series.map(({ index, ...s }) => ({ ...s, mentions: at(index), share: shareOf(at(index)) })),
      ...(others > 0 ? [{ key: "other", name: "Other competitors", isYou: false, color: OTHER_COLOR, mentions: others, share: shareOf(others) }] : []),
    ],
    mentions,
    byModel: charts.byModel.map((m) => ({ model: MODEL_LABELS[m.model], ...values(m.scores) })),
  };
}

/**
 * You against one competitor at each scan (the comparison page): each scan's own hit rate, and the 30-day scores as
 * they stood then for the dashed reference.
 */
export type PairPoint = { label: string; you: number | null; them: number | null; youRolling: number | null; themRolling: number | null };

export function pairTimeline(report: ScoreReport, competitor: string): PairPoint[] {
  const charts = report.charts;
  if (!charts) return [];
  const at = charts.names.indexOf(competitor);
  if (at < 1) return [];
  return charts.timeline.map((p) => ({
    label: dayLabel(p.date),
    you: round(p.scores[0]),
    them: round(p.scores[at]),
    youRolling: round(p.rolling[0]),
    themRolling: round(p.rolling[at]),
  }));
}
