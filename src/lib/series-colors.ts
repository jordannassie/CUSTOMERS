// One color per business across the app (2026-10-27, the user's call): you in the brand blue, each competitor its own
// hue by its place on the leaderboard, the same on the Overview, the Competitors charts and Compare. Validated as a
// categorical set (dataviz checker); names always sit beside them. Pure.

export const SERIES_COLORS = ["var(--chart-1)", "var(--cd-series-2)", "var(--cd-series-3)", "var(--cd-series-4)", "var(--cd-series-5)"];

/** Past the fifth business, and "Other competitors": a neutral grey. */
export const OTHER_SERIES_COLOR = "var(--cd-competitor-2)";

/** 0 is you; 1 is the competitor first on the leaderboard, and so on. */
export const colorAt = (i: number) => SERIES_COLORS[i] ?? OTHER_SERIES_COLOR;

/**
 * The order colors follow: tracked competitors with a score, in leaderboard order (strongest first, still collecting
 * last). Every chart picks a competitor's color from its place here, so it never changes color between pages.
 */
export function colorOrder(leaderboard: { name: string; isYou: boolean; score: number | null }[]): string[] {
  return leaderboard.filter((r) => !r.isYou && r.score !== null).map((r) => r.name);
}

/** A competitor's color by its tracked name; grey when it has no score yet. */
export function competitorColor(order: string[], name: string): string {
  const i = order.indexOf(name);
  return i < 0 ? OTHER_SERIES_COLOR : colorAt(i + 1);
}
