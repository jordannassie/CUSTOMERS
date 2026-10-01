import { isRealChange, type ScanPoint } from "@/modules/scanning";

// "Score at each scan" (DB-002): the 30-day score as it stood at every scan in the last 90 days, joined, with its
// margin as a band. Under 2 scans a sentence says it instead (DB-001). The score itself is unchanged (D-63).

export const HISTORY_DAYS = 90;
export const MIN_CHART_POINTS = 2;

export type TrendView = {
  /** Oldest first. `label` is the axis text, "Sep 28"; `band` is the score plus and minus its margin. */
  points: { date: string; label: string; score: number; margin: number; band: [number, number] }[];
  /** "Up 9 points since Sep 2", only when the first and last scan differ by more than their margins (D-64). */
  change: { direction: "up" | "down"; text: string } | null;
  /** Shown instead of the chart while there are fewer than 2 scans. */
  summary: string | null;
  /** Under the chart: how to read it, and the next scan. */
  caption: string;
};

/** "Oct 8", in UTC like the scan days. */
export function shortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

export function historyChange(history: ScanPoint[]): TrendView["change"] {
  if (history.length < 2) return null;
  const [first, last] = [history[0], history.at(-1)!];
  const gap = Math.round(last.score) - Math.round(first.score);
  if (!isRealChange(last, first) || gap === 0) return null;
  return { direction: gap > 0 ? "up" : "down", text: `${gap > 0 ? "Up" : "Down"} ${points(Math.abs(gap))} since ${shortDate(first.date)}` };
}

export function trendView(input: { history: ScanPoint[]; nextScanAt: Date | null; now: Date }): TrendView {
  const shown = input.history.map((p) => {
    const score = Math.round(p.score);
    const margin = Math.round(p.margin);
    return {
      date: p.date,
      label: shortDate(p.date),
      score,
      margin,
      band: [Math.max(0, score - margin), Math.min(100, score + margin)] as [number, number],
    };
  });
  const next =
    input.nextScanAt && input.nextScanAt.getTime() > input.now.getTime() ? `Next scan ${shortDate(input.nextScanAt)}.` : null;

  if (shown.length < MIN_CHART_POINTS) {
    const so = shown.length === 0 ? "No scans in the last 90 days." : `1 scan in the last 90 days: ${shown[0].score}.`;
    return { points: shown, change: null, summary: [so, next].filter(Boolean).join(" "), caption: "" };
  }
  return {
    points: shown,
    change: historyChange(input.history),
    summary: null,
    caption: ["Each dot is one scan. The shaded band is how far the score could be off.", next].filter(Boolean).join(" "),
  };
}
