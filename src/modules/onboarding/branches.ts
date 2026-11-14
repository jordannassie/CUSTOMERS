// One branch per chain, near the business (2026-10-27, the owner's rule): of all the branches of a chain Google
// returns, only the nearest is offered, plus any other in the business's own neighbourhood. Branches farther than
// the area the business serves are never offered. Locations come live from Google and are never stored (D-73). Pure.
import type { CompetitorCandidate, Origin } from "./competitor-places";

/** Branches this close to the business count as its own neighbourhood: more than one may be tracked. */
export const SAME_AREA_M = 3_000;
/** Farther than this is another area, not a local competitor (the same circle the search is biased to). */
export const FAR_M = 20_000;

/** Straight-line distance in meters between two points (haversine). */
export function distanceM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// Sites many businesses share: the same one never makes two places one chain.
const SHARED_HOSTS = /(^|\.)(facebook|instagram|linktr|google|business\.site|wixsite|square|toasttab|foodpanda|ubereats|doordash|grubhub|yelp|tripadvisor|tiktok|whatsapp)\./i;

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return SHARED_HOSTS.test(`${host}.`) || SHARED_HOSTS.test(host) ? null : host;
  } catch {
    return null;
  }
}

const words = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Two places are branches of one chain when they share a website, or, with no website telling them apart, when a
 * name of two or more words starts the other ("Pizza Hut" and "Pizza Hut Saddar") or both start with the same two
 * words ("Domino's Pizza Saddar", "Domino's Pizza Chaklala"). One shared word is not enough: "Canopy" and "Canopy
 * Tree Service" are different businesses. Different websites mean different businesses, whatever the names.
 */
export function sameChain(a: CompetitorCandidate, b: CompetitorCandidate): boolean {
  const ha = hostOf(a.website);
  const hb = hostOf(b.website);
  if (ha && hb) return ha === hb;
  const wa = words(a.name);
  const wb = words(b.name);
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  if (short.length === 0) return false;
  const startsWith = short.every((w, i) => long[i] === w);
  if (startsWith && short.length >= 2 && short.length < long.length) return true;
  return wa.length >= 3 && wb.length >= 3 && wa[0] === wb[0] && wa[1] === wb[1];
}

/** Each candidate with its distance from the business, when both locations are known. */
export function withDistance(candidates: CompetitorCandidate[], origin: Origin | null): CompetitorCandidate[] {
  if (!origin) return candidates;
  return candidates.map((c) => (c.location ? { ...c, distanceM: Math.round(distanceM(origin, c.location)) } : c));
}

/**
 * The owner's rule for chains: far branches out, then per chain the nearest branch plus any other within the
 * business's neighbourhood. Order is kept. With no distance known (the business has no Google listing, or Google gave
 * no location), the first branch Google returned stands in for the nearest.
 */
export function nearestBranches(candidates: CompetitorCandidate[]): CompetitorCandidate[] {
  const near = candidates.filter((c) => c.distanceM === undefined || c.distanceM === null || c.distanceM <= FAR_M);
  const groups: CompetitorCandidate[][] = [];
  for (const c of near) {
    const group = groups.find((g) => g.some((other) => sameChain(c, other)));
    if (group) group.push(c);
    else groups.push([c]);
  }
  const keep = new Set<string>();
  for (const group of groups) {
    const known = group.filter((c) => typeof c.distanceM === "number").sort((a, b) => a.distanceM! - b.distanceM!);
    const nearest = known[0] ?? group[0];
    keep.add(nearest.placeId);
    for (const c of known) if (c.distanceM! <= SAME_AREA_M) keep.add(c.placeId);
  }
  return near.filter((c) => keep.has(c.placeId));
}

const MILES = new Set(["US", "GB", "LR", "MM"]);

/** "800 m away", "2.4 km away", or in miles where people use them ("0.5 mi away"). */
export function distanceText(meters: number, country: string | null | undefined): string {
  if (MILES.has((country ?? "").toUpperCase())) {
    const mi = meters / 1609.344;
    return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi away`;
  }
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)} m away`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

/** Location and website only choose the branch; the screen and the save get neither (D-73). */
export function forDisplay(candidates: CompetitorCandidate[], country?: string | null): CompetitorCandidate[] {
  return candidates.map((c) => ({
    placeId: c.placeId,
    name: c.name,
    rating: c.rating,
    reviewCount: c.reviewCount,
    address: c.address,
    mapsUri: c.mapsUri,
    ...(c.primaryType ? { primaryType: c.primaryType } : {}),
    ...(typeof c.distanceM === "number" ? { distanceM: c.distanceM, distance: distanceText(c.distanceM, country) } : {}),
  }));
}
