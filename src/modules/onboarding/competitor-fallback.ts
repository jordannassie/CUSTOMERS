// When the first search finds no competitor (Big Tex Auto Mart, a used car dealer in Dallas, got none, 2026-11-16),
// two wider searches before giving up, so the step almost always has some to tick:
// 1. the same words without the business's own Google type, which can clash with the search term (a car dealer
//    searched as "auto repair shop"), kept to the usual nearby area;
// 2. the business's kind across its state or region, nearest first, one branch per chain, with no distance limit.
// The caller says so ("the closest we found further away"). Places data is only shown here, never stored.
import { forDisplay, nearestBranches, sameChain, withDistance } from "./branches";
import type { CompetitorCandidate, CompetitorPlaces, Origin } from "./competitor-places";

const SEARCH_PAGE = 20;

type Ctx = {
  term: string;
  query: string;
  region: string | null;
  origin: Origin | null;
  country?: string | null;
  /** Drops the business itself and repeats, up to the most to show (competitors.ts withoutOwnBusiness). */
  own: (found: CompetitorCandidate[]) => CompetitorCandidate[];
};

/** One branch per chain, nearest first when distances are known, with no "too far" cut. Pure. */
export function nearestPerChain(found: CompetitorCandidate[]): CompetitorCandidate[] {
  const byDistance = [...found].sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  const out: CompetitorCandidate[] = [];
  for (const c of byDistance) if (!out.some((o) => sameChain(o, c))) out.push(c);
  return out;
}

/** Suggestions from the wider searches; empty when Google has none even state-wide. */
export async function widerSuggestions(places: CompetitorPlaces, ctx: Ctx): Promise<CompetitorCandidate[]> {
  const untyped = await places.search(ctx.query, SEARCH_PAGE, ctx.origin, false);
  const near = forDisplay(ctx.own(nearestBranches(withDistance(untyped, ctx.origin))), ctx.country);
  if (near.length || !ctx.region) return near;
  const wide = await places.search(`${ctx.term} in ${ctx.region}`, SEARCH_PAGE, ctx.origin, false);
  return forDisplay(ctx.own(nearestPerChain(withDistance(wide, ctx.origin))), ctx.country);
}
