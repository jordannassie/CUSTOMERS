// Competitors follow the business's location (2026-10-16): when its city, region or country changes, picked Google
// competitors elsewhere are removed and ones added by name are flagged. Only place ids are stored (D-73), so each
// competitor's city is read live from Places and compared here, never saved.
import type { PlaceArea } from "../competitor-places";

/** The business's own place, as the user typed it (country is an ISO code). */
export type BusinessLocation = { city: string | null; region: string | null; country: string | null };
export type LocationChange = { city: boolean; region: boolean; country: boolean };

const SHORT_FORMS: [RegExp, string][] = [
  [/^st\.?\s+/, "saint "],
  [/^ste\.?\s+/, "sainte "],
  [/^ft\.?\s+/, "fort "],
  [/^mt\.?\s+/, "mount "],
];

/** "St. Louis", "Saint Louis" and "saint-louis" compare the same; accents and punctuation are ignored. */
export function placeKey(name: string | null | undefined): string {
  let s = (name ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  for (const [short, long] of SHORT_FORMS) s = s.replace(short, long);
  return s.replace(/[^\p{L}\p{N}]+/gu, "");
}

export function locationChange(before: BusinessLocation, after: BusinessLocation): LocationChange {
  return {
    city: placeKey(before.city) !== placeKey(after.city),
    region: placeKey(before.region) !== placeKey(after.region),
    country: placeKey(before.country) !== placeKey(after.country),
  };
}

export const anyChange = (c: LocationChange) => c.city || c.region || c.country;

/**
 * A competitor is outside the new location when a part of the location that changed is set and Google names a
 * different one for the competitor. Parts that did not change are not compared, so fixing "TX" to "Texas" keeps a
 * competitor in the next town, and a part Google does not give never removes anything.
 */
export function isOutside(area: PlaceArea, now: BusinessLocation, change: LocationChange): boolean {
  const differs = (changed: boolean, value: string | null, names: string[]) =>
    changed && placeKey(value) !== "" && names.length > 0 && !names.some((n) => placeKey(n) === placeKey(value));
  return (
    differs(change.country, now.country, area.country ? [area.country] : []) ||
    differs(change.region, now.region, area.regions) ||
    differs(change.city, now.city, area.cities)
  );
}

/** What the "removed" note calls the old place: its city, else its region. */
export function oldPlaceName(before: BusinessLocation): string | null {
  return before.city?.trim() || before.region?.trim() || null;
}

const list = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? ""));

/** "We removed 2 competitors from Austin. The suggestions below are near Dallas." */
export function removedNote(count: number, from: string[], city: string | null): string {
  const what = count === 1 ? "1 competitor" : `${count} competitors`;
  const near = city?.trim();
  const first = from.length ? `We removed ${what} from ${list(from)}.` : `We removed ${what} that ${count === 1 ? "is" : "are"} not near your business.`;
  return near ? `${first} The suggestions below are near ${near}.` : first;
}

/** The line under a competitor added by name before the business moved. */
export function checkNearNote(city: string): string {
  return `Added by name: check it is near ${city}`;
}

/** Whether a saved competitor needs that line: typed by name (no Google listing) and added before the move. */
export function needsNearCheck(row: { placesId: string | null; createdAt: string }, locationChangedAt: string | null): boolean {
  return !row.placesId && locationChangedAt !== null && Date.parse(row.createdAt) <= Date.parse(locationChangedAt);
}
