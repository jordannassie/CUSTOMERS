// Opportunities groups (B-88). The rule for where a fix goes lives in src/lib/fix-where.ts, shared with the
// "Fix on ..." links under likely reasons. Pure.
import type { Where } from "@/lib/fix-where";

export { fixCardId, fixHref, whereOf, type Where } from "@/lib/fix-where";

export const WHERE_ORDER: Where[] = ["website", "google_listing", "other_places"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tracked competitors the fix names, in the order they are tracked. */
export function competitorsIn(text: string, names: string[]): string[] {
  return names.filter((n) => n.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${escape(n.trim())}($|[^\\p{L}\\p{N}])`, "iu").test(text));
}

const IMPACT_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Fixes by where you make them; the group holding the most important fix comes first, cards keep their order. */
export function byWhere<T extends { where: Where; impact: keyof typeof IMPACT_RANK }>(items: T[]): { where: Where; items: T[] }[] {
  const best = (group: T[]) => Math.min(...group.map((o) => IMPACT_RANK[o.impact]));
  return WHERE_ORDER.map((where) => ({ where, items: items.filter((o) => o.where === where) }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => best(a.items) - best(b.items) || WHERE_ORDER.indexOf(a.where) - WHERE_ORDER.indexOf(b.where));
}
