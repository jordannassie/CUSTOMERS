// Share of AI picks and your website's citations, over the score's own answers (the last 30 days, suggested questions,
// the business's AI tools). One rule for the Overview and the report, so the two never disagree (audit, 2026-10-28).
// Pure.
import { isOwnSite } from "@/lib/site-type";
import type { StandingCheck } from "./checks";

const key = (name: string) => name.trim().toLowerCase();

/** How many answers cited the business's own website. */
export function citations(checks: StandingCheck[], domain: string | null) {
  return { cited: checks.filter((c) => c.sites.some((h) => isOwnSite(h, domain))).length, answers: checks.length, hasSite: !!domain };
}

/**
 * How many answers named each row: `names` lists the tracked names a row counts (a chain row counts each answer once,
 * however many of its branches it named). The counts behind `shares`, for a chart that also shows them.
 */
export function pickCounts(checks: StandingCheck[], rows: { isYou: boolean; names: string[] }[]): number[] {
  return rows.map((row) => {
    const wanted = new Set(row.names.map(key));
    return checks.filter((c) => (row.isYou ? c.youNamed : c.competitors.some((n) => wanted.has(key(n))))).length;
  });
}

/** One share from the counts: rounded once, so every screen shows the same whole number. Null with no picks at all. */
export const shareOf = (n: number, total: number): number | null => (total === 0 ? null : Math.round((100 * n) / total));

/**
 * Share of AI picks: of every time AI named one of these businesses, the percent that named each (pickCounts). One
 * rule for the Overview, the report and the Competitors donut. Null for every row with no names.
 */
export function shares(checks: StandingCheck[], rows: { isYou: boolean; names: string[] }[]): (number | null)[] {
  const counts = pickCounts(checks, rows);
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map((n) => shareOf(n, total));
}

export type SiteRow = { host: string; answers: number; namedYou: number; own: boolean };

/** The sites AI used most over these answers, with how many of those answers named the business. */
export function siteRows(checks: StandingCheck[], domain: string | null, max: number): SiteRow[] {
  const rows = new Map<string, SiteRow>();
  for (const check of checks) {
    for (const host of new Set(check.sites)) {
      const row = rows.get(host) ?? { host, answers: 0, namedYou: 0, own: isOwnSite(host, domain) };
      row.answers += 1;
      if (check.youNamed) row.namedYou += 1;
      rows.set(host, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.answers - a.answers || a.host.localeCompare(b.host)).slice(0, max);
}
