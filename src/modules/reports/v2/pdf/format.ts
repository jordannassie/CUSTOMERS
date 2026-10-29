import type { Priority, ReportSnapshot } from "../snapshot-schema";

// Wording helpers for the PDF. Pure, so the tests can check them without drawing anything.

const toDate = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => {
  const d = toDate(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(d);
};

/** "Oct 28, 2026". */
export const formatDate = (iso: string) => fmt(iso, { month: "short", day: "numeric", year: "numeric" });

/** "Sep 29 to Oct 28, 2026", with the first year only when the period crosses a new year. */
export function formatPeriod(period: ReportSnapshot["period"]): string {
  const sameYear = toDate(period.start).getUTCFullYear() === toDate(period.end).getUTCFullYear();
  const start = sameYear ? fmt(period.start, { month: "short", day: "numeric" }) : formatDate(period.start);
  return `${start} to ${formatDate(period.end)}`;
}

/** "ChatGPT, Claude and Perplexity". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const ENGINE_NAMES: Record<string, string> = {
  openai: "ChatGPT",
  chatgpt: "ChatGPT",
  anthropic: "Claude",
  claude: "Claude",
  perplexity: "Perplexity",
};

/** Engine names as people know them; unknown names are shown as stored. */
export const engineName = (engine: string) => ENGINE_NAMES[engine.toLowerCase()] ?? engine;
export const engineList = (engines: string[]) => joinList(engines.map(engineName));

/** "Rawalpindi" from "Rawalpindi, Punjab"; null when there is no market. */
export const city = (market: string | null) => market?.split(",")[0]?.trim() || null;

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export const PRIORITY_LABEL: Record<Priority, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
export const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

/** "Fixes 1, 3 and 5" style without the "and": "Fixes 1, 3, 5", "Fix 3". */
export const fixList = (fixes: number[]) => (fixes.length === 1 ? `Fix ${fixes[0]}` : `Fixes ${fixes.join(", ")}`);

/** "Fixed by #2", "Fixed by #3 and #5". */
export const fixedBy = (fixes: number[]) => `Fixed by ${joinList(fixes.map((n) => `#${n}`))}`;

/** Two letters for the logo placeholder: "Bright Local" gives "BL". */
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}
