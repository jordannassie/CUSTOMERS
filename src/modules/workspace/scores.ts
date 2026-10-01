import type { Change } from "@/modules/scanning";

// Scores in the business switcher (DB-011), so an agency sees which client dropped without opening each one.

export type SwitcherScore = {
  score: number | null;
  tone: "good" | "mid" | "low" | null;
  /** The weekly change, only when it is bigger than the margin (D-64). */
  change: { direction: Change["direction"]; points: number } | null;
  /** "Last scan Sep 28", or "No scans yet". */
  lastScan: string;
};

export type SwitcherScores = { order: string[]; byId: Record<string, SwitcherScore> };

export function switcherScore(
  report: { overall: { score: number } | null; change: Change | null; lastCheckedAt: Date | null },
  tone: (score: number) => "good" | "mid" | "low",
): SwitcherScore {
  const score = report.overall ? Math.round(report.overall.score) : null;
  const points = report.change ? Math.round(report.change.points) : 0;
  return {
    score,
    tone: score === null ? null : tone(score),
    change: report.change && points > 0 ? { direction: report.change.direction, points } : null,
    lastScan: report.lastCheckedAt
      ? `Last scan ${report.lastCheckedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
      : "No scans yet",
  };
}

/** Biggest real drop first, then the rest in their usual order. */
export function dropFirst(ids: string[], byId: Record<string, SwitcherScore>): string[] {
  const drop = (id: string) => (byId[id]?.change?.direction === "down" ? byId[id].change!.points : 0);
  return ids
    .map((id, i) => ({ id, i, drop: drop(id) }))
    .sort((a, b) => b.drop - a.drop || a.i - b.i)
    .map((r) => r.id);
}
