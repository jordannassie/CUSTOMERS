import { z } from "zod";

// The Questions page opened from another page's link (questionsHref): ?site= keeps the questions whose answers used
// that site, ?named= the ones where AI named that business and not you. Pure, over answers the scans already saved.

export type FocusCheck = {
  questionId: string;
  /** The AI tool that answered; checked only when the link names one (?ai=). */
  provider?: string;
  youNamed: boolean;
  /** Hosts the answer cited. */
  sites: string[];
  /** Tracked competitors it named. */
  competitors: string[];
  /** The name extractor's saved list, for businesses you don't track. */
  extracted: unknown;
};

const extracted = z.object({
  names: z.array(z.object({ name: z.string(), matches: z.string().nullish(), competitorName: z.string().nullish() })),
});
const key = (s: string) => s.trim().toLowerCase();

/** maps.google.com counts for google.com. */
export const usesSite = (host: string, site: string) => host === site || host.endsWith(`.${site}`);

/**
 * Every name the answer gave a business, in every form we saved: the tracked name ("Domino's Pizza | Chaklala-III"),
 * the words AI used ("Domino's Pizza") and other businesses, so a link by either name finds the answer.
 */
function namesIn(check: FocusCheck): string[] {
  const parsed = extracted.safeParse(check.extracted);
  const saved = parsed.success ? parsed.data.names.flatMap((n) => [n.name, ...(n.competitorName ? [n.competitorName] : [])]) : [];
  return [...check.competitors, ...saved].map(key);
}

export type Focus = { site?: string | null; named?: string | null; ai?: string | null };

/** One answer passes the link only when it does everything the link asks: used the site and named them, not you. */
export function checkMatches(check: FocusCheck, focus: Focus): boolean {
  if (!focus.site && !focus.named) return false;
  if (focus.ai && check.provider !== focus.ai) return false;
  if (focus.site && !check.sites.some((h) => usesSite(h, focus.site!))) return false;
  if (focus.named && (check.youNamed || !namesIn(check).includes(key(focus.named)))) return false;
  return true;
}

/** Question ids with at least one answer that passes the link; undefined when no link is set, so every question shows. */
export function focusMatches(checks: FocusCheck[], focus: Focus): Set<string> | undefined {
  if (!focus.site && !focus.named) return undefined;
  return new Set(checks.filter((c) => checkMatches(c, focus)).map((c) => c.questionId));
}
