export type Revenue =
  | { state: "not_connected" }
  | { state: "error" }
  | { state: "ok"; cents: number; mode: "stripe" | "fixture" };

/** Share of revenue spent on AI calls (0.12 = 12 cents per dollar), or null when there is no revenue to compare. */
export function aiCostShare(costUsd: number, revenue: Revenue): number | null {
  if (revenue.state !== "ok" || revenue.cents <= 0) return null;
  return costUsd / (revenue.cents / 100);
}

// Month-on-month for the Overview numbers (DB-018). Money and credits compare the same days of last month.

const DAY_MS = 86_400_000;

export type MonthBounds = { monthStart: Date; lastMonthStart: Date; lastMonthSameTime: Date };

/** This month so far, and the same stretch of last month (cut at its end in a shorter month). */
export function monthBounds(now: Date): MonthBounds {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthSameTime = new Date(Math.min(lastMonthStart.getTime() + (now.getTime() - monthStart.getTime()), monthStart.getTime()));
  return { monthStart, lastMonthStart, lastMonthSameTime };
}

type Day = { day: string; credits: number; costUsd: number };

/** Totals of the days from `from` up to and including the day of `to`. */
export function sumDays(byDay: Day[], from: Date, to: Date): { credits: number; costUsd: number } {
  const [a, b] = [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
  const days = byDay.filter((d) => d.day >= a && d.day <= b);
  return { credits: days.reduce((s, d) => s + d.credits, 0), costUsd: days.reduce((s, d) => s + d.costUsd, 0) };
}

/** The last `days` days, oldest first, for a sparkline. */
export function lastDays(byDay: Day[], now: Date, days = 30): Day[] {
  const from = new Date(now.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  return byDay.filter((d) => d.day >= from);
}

export type MonthChange = { direction: "up" | "down" | "same"; text: string };

/** "Up 12% on the same days last month"; a percent needs something to compare with. */
export function percentChange(current: number, previous: number): MonthChange {
  if (previous === 0) {
    return current === 0
      ? { direction: "same", text: "None last month either" }
      : { direction: "up", text: "None by this day last month" };
  }
  // A percent in the thousands reads as noise; early in a month small numbers make it common.
  if (current >= previous * 10) {
    return { direction: "up", text: `About ${Math.round(current / previous)} times the same days last month` };
  }
  const pct = Math.round((100 * (current - previous)) / previous);
  if (pct === 0) return { direction: "same", text: "Same as the same days last month" };
  return { direction: pct > 0 ? "up" : "down", text: `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% on the same days last month` };
}

/** "Up 3 since Oct 1", for a count that is a snapshot rather than a monthly total. */
export function countChange(current: number, atMonthStart: number, monthStart: Date): MonthChange {
  const gap = current - atMonthStart;
  const since = monthStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (gap === 0) return { direction: "same", text: `No change since ${since}` };
  return { direction: gap > 0 ? "up" : "down", text: `${gap > 0 ? "Up" : "Down"} ${Math.abs(gap)} since ${since}` };
}
