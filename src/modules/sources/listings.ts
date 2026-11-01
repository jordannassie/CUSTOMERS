// "Get listed here first" and the table's buttons on the Sources page (dashboard redesign, 2026-10-27). Pure.
import type { SubKind } from "./classify";
import type { Site } from "./service";

export type Impact = "high" | "medium" | "low";

/**
 * How much a listing could help, from how often AI used the site:
 * high when it was used in at least 1 in 5 answers (and at least 3 answers, so one early scan can't make it high),
 * medium when used in at least 1 in 20 answers or in 2 or more, low otherwise.
 */
export function impactFor(answers: number, total: number): Impact {
  const share = total > 0 ? answers / total : 0;
  if (answers >= 3 && share >= 0.2) return "high";
  if (answers >= 2 || share >= 0.05) return "medium";
  return "low";
}

/** Kinds of site where the owner can have a listing, a page or a post. Never another business's own site (BUG-100). */
const LISTABLE: ReadonlySet<SubKind> = new Set(["delivery", "food_guide", "social", "reviews", "directory", "travel_guide", "news"]);

export const canGetListed = (site: Pick<Site, "kind">) => LISTABLE.has(site.kind);

/** The key "Add to Actions" saves; Compare uses the same one, so a site is never added twice. */
export const siteKey = (host: string) => `site:${host}`;

const isGoogle = (host: string) => /(^|\.)google\.[a-z.]+$/.test(host);

/** The one-line fix for a site, by its kind. `place`: "Orange, CA", for the guides. */
export function fixFor(site: Pick<Site, "host" | "kind">, place: string | null): string {
  if (isGoogle(site.host)) return "Claim and complete your Google Business Profile: hours, photos, services.";
  switch (site.kind) {
    case "delivery":
      return "Complete your page: menu, prices, hours and reviews.";
    case "social":
      return "Post regularly and tag your location in each post.";
    case "food_guide":
    case "travel_guide":
    case "news":
      return `Ask to be added to their lists of local favorites${place ? ` in ${place}` : ""}.`;
    default:
      return "Claim your listing and complete it: hours, photos, services and reviews.";
  }
}

export function titleFor(site: Pick<Site, "host" | "kind">): string {
  if (isGoogle(site.host)) return "Complete your Google Business Profile";
  switch (site.kind) {
    case "delivery":
      return `Complete your page on ${site.host}`;
    case "social":
      return `Post location-tagged content on ${site.host}`;
    case "food_guide":
    case "travel_guide":
    case "news":
      return `Ask ${site.host} to add you`;
    default:
      return `Get listed on ${site.host}`;
  }
}

/** "Used in 33 answers that did not name you." or "Used in 24 answers, 20 without naming you." */
export function usedLine(site: Pick<Site, "answers" | "answersWithoutYou">): string {
  const n = site.answers;
  const answers = `${n} ${n === 1 ? "answer" : "answers"}`;
  if (site.answersWithoutYou >= n) return `Used in ${answers} that did not name you.`;
  return `Used in ${answers}, ${site.answersWithoutYou} without naming you.`;
}

/** What "Add to Actions" sends (addActionInput in the opportunities module), without the business id. */
export type SiteAction = {
  title: string;
  fact: string;
  whatToDo: string;
  whereToApply: string;
  impact: Impact;
  category: "citations" | "reviews_reputation";
  source: "sources";
  dedupeKey: string;
  evidenceData: { domain: string; answers: number };
};

export function siteAction(site: Site, total: number, opts: { place: string | null; toolLabel: string | null }): SiteAction {
  const who = opts.toolLabel ?? "AI";
  const skipped = site.answersWithoutYou;
  return {
    title: titleFor(site),
    fact: `${who} used ${site.host} in ${site.answers} of ${total} ${total === 1 ? "answer" : "answers"} in the last 30 days, and ${skipped} of them did not name you.`,
    whatToDo: fixFor(site, opts.place),
    whereToApply: site.host,
    impact: impactFor(site.answers, total),
    category: site.kind === "reviews" ? "reviews_reputation" : "citations",
    source: "sources",
    dedupeKey: siteKey(site.host),
    evidenceData: { domain: site.host, answers: site.answers },
  };
}

export const LISTED_FIRST = 4;

/** The sites that skip you most, where a listing could help: not your site, not a competitor's. */
export function listedFirst(sites: Site[], n = LISTED_FIRST): Site[] {
  return sites
    .filter((s) => canGetListed(s) && s.answersWithoutYou > 0)
    .sort((a, b) => b.answersWithoutYou - a.answersWithoutYou || b.answers - a.answers || a.host.localeCompare(b.host))
    .slice(0, n);
}

/** The table's button: "Get listed" (Add to Actions), "Improve" (the Actions page) or "Compare" (a competitor's site). */
export type Cta = "listed" | "improve" | "compare" | null;

export function ctaFor(site: Pick<Site, "kind" | "mentions" | "competitorId">): Cta {
  if (site.kind === "competitor") return site.competitorId ? "compare" : null;
  if (site.kind === "own") return "improve";
  if (!LISTABLE.has(site.kind)) return null;
  return site.mentions === "no" ? "listed" : "improve";
}
