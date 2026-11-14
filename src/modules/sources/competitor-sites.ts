// Which cited sites are a competitor's own website (dashboard redesign, 2026-10-27). A site is a competitor site when
// it is a tracked competitor's website (business_competitors.domain), or when its name matches a tracked competitor
// or a business AI named in the answers (siteOwner, shared with the "why competitors win" facts, BUG-100). Pure.
import { hostOf, siteOwner } from "@/lib/site-type";
import { canBeBusinessSite } from "./classify";

export type TrackedCompetitor = { id: string; name: string; domain: string | null; aliases: string[] };

/** Whose website it is: the tracked competitor's id when we know it, so the row can link to Compare. */
export type SiteOwner = { name: string; competitorId: string | null };

export function competitorSiteOwner(
  host: string,
  ownDomain: string | null,
  tracked: TrackedCompetitor[],
  aiNamed: string[],
): SiteOwner | null {
  if (!canBeBusinessSite(host, ownDomain)) return null;
  for (const c of tracked) {
    const domain = c.domain ? hostOf(c.domain) : null;
    if (domain && (host === domain || host.endsWith(`.${domain}`))) return { name: c.name, competitorId: c.id };
  }
  for (const c of tracked) {
    if (siteOwner(host, [c.name, ...c.aliases])) return { name: c.name, competitorId: c.id };
  }
  const named = siteOwner(host, aiNamed);
  return named ? { name: named, competitorId: null } : null;
}
