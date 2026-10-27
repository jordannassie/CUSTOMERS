import { z } from "zod";

// The Questions page opened from another page's link (questionsHref): ?site= keeps the questions whose answers used
// that site, ?named= the ones where AI named that business and not you. Pure, over answers the scans already saved.

export type FocusCheck = {
  questionId: string;
  youNamed: boolean;
  /** Hosts the answer cited. */
  sites: string[];
  /** Tracked competitors it named. */
  competitors: string[];
  /** The name extractor's saved list, for businesses you don't track. */
  extracted: unknown;
};

const extracted = z.object({ names: z.array(z.object({ name: z.string(), matches: z.string().nullish() })) });
const key = (s: string) => s.trim().toLowerCase();

/** maps.google.com counts for google.com. */
export const usesSite = (host: string, site: string) => host === site || host.endsWith(`.${site}`);

function namesIn(check: FocusCheck): string[] {
  const parsed = extracted.safeParse(check.extracted);
  const others = parsed.success ? parsed.data.names.filter((n) => !n.matches).map((n) => n.name) : [];
  return [...check.competitors, ...others].map(key);
}

/** Question ids that pass both links; undefined when neither is set, so every question shows. */
export function focusMatches(checks: FocusCheck[], focus: { site?: string | null; named?: string | null }): Set<string> | undefined {
  if (!focus.site && !focus.named) return undefined;
  const bySite = new Set<string>();
  const byName = new Set<string>();
  const wanted = focus.named ? key(focus.named) : null;
  for (const c of checks) {
    if (focus.site && c.sites.some((h) => usesSite(h, focus.site!))) bySite.add(c.questionId);
    if (wanted && !c.youNamed && namesIn(c).includes(wanted)) byName.add(c.questionId);
  }
  const ids = new Set(checks.map((c) => c.questionId));
  return new Set([...ids].filter((id) => (!focus.site || bySite.has(id)) && (!wanted || byName.has(id))));
}
