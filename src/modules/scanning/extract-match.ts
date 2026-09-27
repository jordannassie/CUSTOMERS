// Matches extracted names to one business and its tracked competitors (MVP_SPEC 5.2, D-74).
// Runs per business on the shared extraction, so a cache hit needs no new AI call.
import type { ExtractedName } from "./extract";
import type { MentionTarget } from "./mentions";
import { coreName, domainOf, findDomain, findPhrase, isGenericName } from "./mention-text";

export type MatchedName = ExtractedName & {
  matches: "business" | "competitor" | null;
  /** The tracked competitor's name when matches is "competitor". */
  competitorName: string | null;
};

export function matchNames(names: ExtractedName[], business: MentionTarget, competitors: MentionTarget[]): MatchedName[] {
  return names.map((extracted) => {
    if (isSameBusiness(extracted.name, business)) return { ...extracted, matches: "business", competitorName: null };
    const competitor = competitors.find((c) => isSameBusiness(extracted.name, c));
    if (competitor) return { ...extracted, matches: "competitor", competitorName: competitor.name };
    return { ...extracted, matches: null, competitorName: null };
  });
}

/** Names the answer recommends that are neither the business nor a tracked competitor. */
export function alsoRecommended(matched: MatchedName[]): MatchedName[] {
  return matched.filter((m) => m.matches === null);
}

export function isSameBusiness(extractedName: string, target: MentionTarget): boolean {
  const got = coreName(extractedName);
  if (!got) return false;
  const domain = domainOf(target.website);
  if (domain && findDomain(extractedName, domain).length > 0) return true;

  for (const known of [target.name, ...(target.aliases ?? [])]) {
    const want = coreName(known);
    if (!want) continue;
    if (got === want) return true;
    // "Ace Plumbing of Orange" is Ace Plumbing, but a generic "Ace" alone would match too much.
    if (!isGenericName(want) && findPhrase(got, want).length > 0) return true;
    if (!isGenericName(got) && findPhrase(want, got).length > 0) return true;
  }
  return false;
}
