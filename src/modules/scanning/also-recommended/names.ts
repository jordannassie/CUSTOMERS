// "Also recommended by AI" (MVP_SPEC 7.1, 8.1, D-74): businesses the saved answers named that are
// neither the business nor one of its tracked competitors, and how often. Pure, over saved checks.
import { z } from "zod";
import { isSameBusiness } from "../extract-match";
import { brandName, coreName, isGenericName } from "../mention-text";
import type { MentionTarget } from "../mentions";

export type AlsoRecommended = {
  name: string;
  /** Answers that named this business. */
  answers: number;
  /** A cited site whose address spells its name, for its icon (site-match.ts); absent when none fits. */
  domain?: string | null;
};

export type AlsoRecommendedList = {
  names: AlsoRecommended[];
  /** Answers with a readable list of names, so "named in 8 of 40 answers" is honest. */
  answers: number;
};

// visibility_results.extracted_names as the scan writes it (check.ts).
const stored = z.object({
  names: z.array(z.object({ name: z.string(), matches: z.enum(["business", "competitor"]).nullish() })),
});

/**
 * Names are matched again against today's list, so a business tracked after a scan leaves this
 * list at once and a removed competitor comes back.
 */
export function alsoRecommendedNames(
  extractions: unknown[],
  business: MentionTarget,
  competitors: MentionTarget[],
  max = 8,
): AlsoRecommendedList {
  const groups = new Map<string, { answers: number; spellings: Map<string, number> }>();
  const keyOf = (name: string) => coreName(brandName(name, business.city) ?? name);
  const sameAs = shortestForms(
    extractions.flatMap((v) => stored.safeParse(v).data?.names.map((n) => keyOf(n.name)) ?? []),
    coreName(business.city ?? ""),
  );
  let answers = 0;
  for (const value of extractions) {
    const parsed = stored.safeParse(value);
    if (!parsed.success) continue;
    answers += 1;
    const seen = new Set<string>();
    for (const { name, matches } of parsed.data.names) {
      // "Abacus Plumbing, Air Conditioning & Electrical" and "Abacus Plumbing" are one business (BUG-097).
      // "Canopy by Hilton Austin Downtown" is the "Canopy" the other answers named (step 9b).
      const key = sameAs.get(keyOf(name)) ?? keyOf(name);
      if (!key || seen.has(key) || matches === "business") continue;
      if (isSameBusiness(name, business) || competitors.some((c) => isSameBusiness(name, c))) continue;
      seen.add(key);
      const group = groups.get(key) ?? { answers: 0, spellings: new Map<string, number>() };
      group.answers += 1;
      group.spellings.set(name.trim(), (group.spellings.get(name.trim()) ?? 0) + 1);
      groups.set(key, group);
    }
  }
  const names = [...groups.values()]
    .map((g) => ({ name: mostUsed(g.spellings), answers: g.answers }))
    .sort((a, b) => b.answers - a.answers || a.name.localeCompare(b.name))
    .slice(0, max);
  return { names, answers };
}

function mostUsed(spellings: Map<string, number>): string {
  return [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

/**
 * Each name, mapped to the shortest other name in the list that its words start with: "canopy by hilton austin
 * downtown" to "canopy". Only a distinctive name groups others; a generic one ("the") or the city never does.
 */
function shortestForms(keys: string[], city: string): Map<string, string> {
  const distinct = [...new Set(keys.filter(Boolean))].sort((a, b) => a.length - b.length);
  const out = new Map<string, string>();
  for (const key of distinct) {
    const short = distinct.find((s) => s !== key && key.startsWith(`${s} `) && !isGenericName(s) && s !== city);
    if (short) out.set(key, out.get(short) ?? short);
  }
  return out;
}
