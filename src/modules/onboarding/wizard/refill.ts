// The details step opened again before it was confirmed (BUG-139). The first visit's auto-fill lives only in that
// browser tab, so a new tab, the next day or another device got the website facts alone: Google's name, industry
// and neighborhood were gone. Places values are never stored (D-73), so the listing is fetched live again and merged
// the same way auto-fill did. Pure.
import type { PlaceCandidate } from "../places";
import type { AutofillOutput } from "../prompts/business-autofill.v1";
import type { BusinessDetails } from "../schema";
import { mergeDetails } from "../service";

export function refillDetails(
  saved: BusinessDetails,
  facts: AutofillOutput | null,
  place: PlaceCandidate | null,
): { details: BusinessDetails; industryText: string | null } {
  if (!facts && !place) return { details: saved, industryText: null };
  const { industryText, ...merged } = mergeDetails(facts, place);
  const found = Object.entries(merged).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v));
  return { details: { ...saved, ...Object.fromEntries(found) }, industryText: industryText ?? null };
}
