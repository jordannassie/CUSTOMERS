// Text rules and the name extractor, together (MVP_SPEC 5.5, 5.2). The text rules need a second signal for a
// generic name ("Precision Plumbing" with the city nearby) and miss a short brand inside a long Google name
// ("Roto-Rooter" for "Roto-Rooter Plumbing & Water Cleanup"). The extractor reads which businesses the answer
// recommends, and matching its names already handles both. A name counts when either finds it, the same way for
// the business and every competitor, so the counts and the extractor's lists agree.
import type { MatchedName } from "./extract-match";
import { phrasePosition, type MentionResult } from "./mentions";

type Detected = {
  business: MentionResult;
  competitors: (MentionResult & { name: string })[];
};

export type MergedMentions = {
  business: { mentioned: boolean; position: number | null };
  competitors: { name: string; mentioned: boolean; position: number | null }[];
};

/** The list item an extracted name sits in, found by its own text in the answer; null outside a list. */
function positionOf(answer: string, names: MatchedName[]): number | null {
  for (const n of names) {
    const position = phrasePosition(answer, n.name);
    if (position !== null) return position;
  }
  return null;
}

export function mergeMentions(answer: string, detected: Detected, matched: MatchedName[] | null): MergedMentions {
  const names = matched ?? [];
  const forBusiness = names.filter((n) => n.matches === "business");
  const business = detected.business.mentioned
    ? { mentioned: true, position: detected.business.position }
    : forBusiness.length > 0
      ? { mentioned: true, position: positionOf(answer, forBusiness) }
      : { mentioned: false, position: null };

  const competitors = detected.competitors.map((c) => {
    if (c.mentioned) return { name: c.name, mentioned: true, position: c.position };
    const found = names.filter((n) => n.matches === "competitor" && n.competitorName === c.name);
    return found.length > 0
      ? { name: c.name, mentioned: true, position: positionOf(answer, found) }
      : { name: c.name, mentioned: false, position: null };
  });
  return { business, competitors };
}
