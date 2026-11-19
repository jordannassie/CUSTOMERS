import type { CompetitorCandidate } from "@/modules/onboarding";
import { withBrand, type BrandedPick } from "./PickedBrand";

const key = (name: string) => name.trim().toLowerCase();

/**
 * The first suggestions in Google's order, one per brand, to tick on a new business's competitors step (MVP gap 1,
 * 2026-11-16): a chain's second branch is not a second competitor. Suggestions never include the business itself.
 */
export function topSuggestions(suggestions: CompetitorCandidate[], count: number): (BrandedPick & { live: CompetitorCandidate })[] {
  const out: (BrandedPick & { live: CompetitorCandidate })[] = [];
  for (const s of suggestions) {
    if (out.length >= count) break;
    const c = withBrand({ name: s.name, placesId: s.placeId, live: s });
    if (!out.some((p) => key(p.name) === key(c.name))) out.push(c);
  }
  return out;
}
