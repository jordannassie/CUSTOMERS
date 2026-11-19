import type { QuestionRow } from "./service";

// The Questions list: its filters, topic chips, the numbers above it and what each row says. Pure and free of server
// code, so the browser filters without asking the server again.

export const LIST_FILTERS = ["all", "named", "never", "worse"] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

export const FILTER_LABELS: Record<ListFilter, string> = {
  all: "All",
  named: "Named you",
  never: "Never named",
  worse: "Getting worse",
};

type Row = Pick<QuestionRow, "named" | "answers" | "trend" | "topic">;

export function inFilter(row: Row, filter: ListFilter): boolean {
  if (filter === "named") return row.named > 0;
  if (filter === "never") return row.answers > 0 && row.named === 0;
  if (filter === "worse") return row.trend === "down";
  return true;
}

const topicKey = (t: string) => t.trim().toLowerCase();

export function inTopic(row: Row, topic: string | null): boolean {
  return topic === null || (row.topic !== null && topicKey(row.topic) === topicKey(topic));
}

/** The topics in use, each once (first spelling wins), A to Z. */
export function topicsOf(rows: Row[]): string[] {
  const seen = new Map<string, string>();
  for (const r of rows) if (r.topic && !seen.has(topicKey(r.topic))) seen.set(topicKey(r.topic), r.topic.trim());
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function filterCounts(rows: Row[], topic: string | null): Record<ListFilter, number> {
  const inT = rows.filter((r) => inTopic(r, topic));
  return Object.fromEntries(LIST_FILTERS.map((f) => [f, inT.filter((r) => inFilter(r, f)).length])) as Record<ListFilter, number>;
}

/** Rows the list shows. A question opened from a link (?q=) always shows, whatever the filters say. */
export function visibleRows<T extends Row & Pick<QuestionRow, "id" | "matches">>(
  rows: T[],
  opts: { filter: ListFilter; topic: string | null; keepId?: string | null },
): T[] {
  return rows.filter((r) => r.id === opts.keepId || (r.matches && inFilter(r, opts.filter) && inTopic(r, opts.topic)));
}

export type QuestionKpis = { active: number; paused: number; checked: number; namedOnce: number; neverNamed: number };

/** The numbers over the active questions, last 30 days. */
export function questionKpis(active: Row[], paused: number): QuestionKpis {
  return {
    active: active.length,
    paused,
    checked: active.filter((r) => r.answers > 0).length,
    namedOnce: active.filter((r) => r.named > 0).length,
    neverNamed: active.filter((r) => inFilter(r, "never")).length,
  };
}

/** "40%" of answers that named you; null before any answer. */
export function namedPercent(row: Pick<QuestionRow, "named" | "answers">): number | null {
  return row.answers > 0 ? Math.round((row.named / row.answers) * 100) : null;
}

/** The business AI named most for this question over 30 days, never you. */
export function topPick(row: Pick<QuestionRow, "summary">) {
  return row.summary?.named[0] ?? null;
}

/** Sites AI used in answers that left you out, most used first. */
export function skippedSites(row: Pick<QuestionRow, "summary">, max = 3): string[] {
  const s = row.summary;
  if (!s || s.you >= s.answers) return [];
  return s.sitesWithoutYou.slice(0, max).map((x) => x.host);
}

export const TREND_TEXT = { up: "Up", same: "Same", down: "Down" } as const;
