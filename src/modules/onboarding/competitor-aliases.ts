// A competitor's other names, and one entry per name and place when saving (moved from competitors.ts). Pure.
import type { ConfirmedCompetitor } from "./competitors";

const ALIASES_MAX = 10;

/** The saved other names plus new ones, once each and never the name itself, up to the column's limit. */
export function mergeAliases(saved: string[], added: string[], name: string): string[] {
  const seen = new Set([nameKey(name)]);
  const out: string[] = [];
  for (const alias of [...saved, ...added]) {
    const text = alias.trim();
    if (!text || seen.has(nameKey(text))) continue;
    seen.add(nameKey(text));
    out.push(text);
  }
  return out.slice(0, ALIASES_MAX);
}

// Matches the unique index on (business_id, lower(name)).
export const nameKey = (name: string) => name.trim().toLowerCase();

/** One entry per name and per place, first one wins. */
export function dedupeConfirmed(list: ConfirmedCompetitor[]): ConfirmedCompetitor[] {
  const names = new Set<string>();
  const placeIds = new Set<string>();
  const out: ConfirmedCompetitor[] = [];
  for (const c of list) {
    const name = c.name.trim();
    if (!name || names.has(nameKey(name)) || (c.placesId && placeIds.has(c.placesId))) continue;
    names.add(nameKey(name));
    if (c.placesId) placeIds.add(c.placesId);
    out.push(c.aliases?.length ? { name, placesId: c.placesId, aliases: c.aliases } : { name, placesId: c.placesId });
  }
  return out;
}
