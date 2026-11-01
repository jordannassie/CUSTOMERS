// The businesses one saved answer recommended, for "Businesses it names most" and to spot competitor sites. Pure.

type StoredName = { name?: unknown; matches?: unknown; competitorName?: unknown };

/**
 * Names from the answer's extracted names (visibility_results.extracted_names), with the business and tracked
 * competitors under the names we know them by. Older answers without extracted names fall back to the tracked
 * competitors it named (competitors_mentioned) and the business when it was named.
 */
export function answerNames(extracted: unknown, competitorsMentioned: unknown, mentioned: boolean, businessName: string): string[] {
  const stored = (extracted as { names?: unknown } | null)?.names;
  const names: string[] = [];
  if (Array.isArray(stored)) {
    for (const n of stored as (StoredName | null)[]) {
      if (typeof n?.name !== "string" || !n.name.trim()) continue;
      if (n.matches === "business") names.push(businessName);
      else if (n.matches === "competitor" && typeof n.competitorName === "string") names.push(n.competitorName);
      else names.push(n.name.trim());
    }
  } else {
    if (mentioned) names.push(businessName);
    if (Array.isArray(competitorsMentioned)) {
      for (const c of competitorsMentioned as ({ name?: unknown } | null)[]) if (typeof c?.name === "string") names.push(c.name);
    }
  }
  // A business named as matched but missing from the extraction still counts once.
  if (mentioned && !names.includes(businessName)) names.unshift(businessName);
  return [...new Set(names)];
}
