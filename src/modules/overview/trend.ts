import { isRealChange, type ScanPoint, type TrendPoint } from "@/modules/scanning";

// The "Last 7 days" block (DB-001). Weekly scans leave one point a week, which a chart shows as a loose dot, so
// then a sentence says it instead; the score itself is unchanged (D-63).

export const MIN_CHART_POINTS = 2;

export type TrendView = {
  /** Scan days in the last 7 days, oldest first; the chart joins them. `label` is the axis text, "Sep 28". */
  points: { date: string; label: string; score: number }[];
  /** Shown instead of the chart while there are fewer than 2 points. */
  summary: string | null;
};

/** "Oct 8", in UTC like the scan days. */
export function shortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

/** "Up 9 points on the Sep 24 scan.", only when the gap is bigger than the margin of both scans (D-64). */
export function scanChangeText(scans: ScanPoint[]): string | null {
  if (scans.length < 2) return null;
  const [before, last] = scans.slice(-2);
  if (!isRealChange(last, before)) return null;
  const gap = Math.round(last.score) - Math.round(before.score);
  if (gap === 0) return null;
  return `${gap > 0 ? "Up" : "Down"} ${points(Math.abs(gap))} on the ${shortDate(before.date)} scan.`;
}

export function trendView(input: {
  trend: TrendPoint[];
  scans: ScanPoint[];
  nextScanAt: Date | null;
  now: Date;
}): TrendView {
  const shown = input.trend.flatMap((p) => (p.score === null ? [] : [{ date: p.date, label: shortDate(p.date), score: Math.round(p.score) }]));
  if (shown.length >= MIN_CHART_POINTS) return { points: shown, summary: null };

  const week = shown.length === 0 ? "No scans this week." : `1 scan this week: ${shown[0].score}.`;
  const change = shown.length > 0 ? scanChangeText(input.scans) : null;
  const next =
    input.nextScanAt && input.nextScanAt.getTime() > input.now.getTime() ? `Next scan ${shortDate(input.nextScanAt)}.` : null;
  return { points: shown, summary: [week, change, next].filter(Boolean).join(" ") };
}
