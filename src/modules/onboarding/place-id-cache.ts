// Which Google listing a name searched near a business matched, kept for 24 hours in this server's memory
// (2026-10-14). Only the place ID is kept, the one Places value Google lets us keep (D-73); names, ratings and
// reviews are always fetched live. Spares a repeated "Track" or "Add by name" its Text Search call. Pure.

const DAY_MS = 86_400_000;
const MAX_ENTRIES = 1_000;
const entries = new Map<string, { placeId: string | null; at: number }>();

export const placeIdKey = (businessId: string, name: string) => `${businessId}\u0000${name.trim().toLowerCase()}`;

/** The remembered match: a place ID, null for "no listing matched", undefined when unknown or older than a day. */
export function cachedPlaceId(key: string, now = Date.now()): string | null | undefined {
  const hit = entries.get(key);
  if (!hit) return undefined;
  if (now - hit.at > DAY_MS) {
    entries.delete(key);
    return undefined;
  }
  return hit.placeId;
}

export function rememberPlaceId(key: string, placeId: string | null, now = Date.now()): void {
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  entries.set(key, { placeId, at: now });
}
