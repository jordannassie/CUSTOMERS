// "Also recommended by AI" (MVP_SPEC 7.1, 8.1, D-74): businesses the saved answers named that are
// neither the business nor one of its tracked competitors, and how often. Pure, over saved checks.
import { z } from "zod";
import { isSameBusiness } from "../extract-match";
import { coreName } from "../mention-text";
import type { MentionTarget } from "../mentions";

export type AlsoRecommended = {
  name: string;
  /** Answers that named this business. */
  answers: number;
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
  let answers = 0;
  for (const value of extractions) {
    const parsed = stored.safeParse(value);
    if (!parsed.success) continue;
    answers += 1;
    const seen = new Set<string>();
    for (const { name, matches } of parsed.data.names) {
      const key = coreName(name);
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
