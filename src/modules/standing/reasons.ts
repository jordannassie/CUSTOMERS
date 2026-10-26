// Likely reasons AI names a competitor more or less than you, from what AI could see: the sites it used in its
// answers, and Google values shown live (D-73). Pure. We cannot see inside the AI tools, so each one is a likely
// reason backed by a fact, never "the" reason.
import { compareCount, compareRating, openDays, sideOf } from "@/lib/google-compare";
import { hostOf, isOwnSite, siteOwner, sourceType } from "@/lib/site-type";
import { namedIn, type StandingCheck } from "./checks";

import type { Where } from "./where";

export { WHERE_TEXT, type Where } from "./where";

/**
 * title and detail: the short form screens show ("More Google reviews", "320 vs your 12"). text: the same fact as one
 * full sentence, for the report, its PDF and the weekly email.
 */
export type Fact = { title: string; detail: string; text: string; where: Where | null; weight: number };

/** Google values for one business, fetched live for this page view and never stored (D-73). */
export type GoogleValues = { rating: number | null; reviewCount: number | null; hours: string[] | null; categories: string[] };

const MIN_ANSWERS = 2;
const MAX_SITES = 2;
const count = (n: number) => n.toLocaleString("en-US");
/** "Bean Tires' website", "Joe's website". */
export const possessive = (name: string) => (/s$/i.test(name.trim()) ? `${name.trim()}'` : `${name.trim()}'s`);
const answers = (n: number) => `${count(n)} ${n === 1 ? "answer" : "answers"}`;

/** Their own website, from the one the user typed, else a cited site whose name matches theirs. */
export function theirSite(checks: StandingCheck[], name: string, domain: string | null): string | null {
  if (domain) return hostOf(domain);
  for (const check of checks) {
    for (const host of check.sites) if (sourceType(host, null) === "business" && siteOwner(host, [name])) return host;
  }
  return null;
}

/** AI used their website more than yours. */
export function websiteFacts(
  checks: StandingCheck[],
  them: { name: string; site: string | null },
  you: { domain: string | null; blocked: boolean },
): { behind: Fact[]; ahead: Fact[] } {
  const usedTheirs = them.site ? checks.filter((c) => c.sites.some((h) => h === them.site || h.endsWith(`.${them.site}`))).length : 0;
  const usedYours = you.domain ? checks.filter((c) => c.sites.some((h) => isOwnSite(h, you.domain))).length : 0;
  const behind: Fact[] = [];
  const ahead: Fact[] = [];
  if (you.blocked) {
    behind.push({
      title: "Your website blocks readers",
      detail: "AI tools may not be able to read it either.",
      text: "Your website turned our reader away, so AI tools may not be able to read it either.",
      where: "website",
      weight: 4,
    });
  }
  if (them.site && usedTheirs >= MIN_ANSWERS && usedTheirs > usedYours) {
    const yours = you.domain ? ` It used yours in ${answers(usedYours)}.` : "";
    behind.push({
      title: "AI quotes their website more",
      detail: you.domain ? `${them.site} in ${answers(usedTheirs)}, yours in ${count(usedYours)}.` : `${them.site} in ${answers(usedTheirs)}.`,
      text: `AI used ${possessive(them.name)} website (${them.site}) in ${answers(usedTheirs)}.${yours} AI tools read business websites to answer these questions.`,
      where: "website",
      weight: 1.5 * (usedTheirs - usedYours),
    });
  } else if (you.domain && usedYours >= MIN_ANSWERS && usedYours > usedTheirs) {
    ahead.push({
      title: "AI quotes your website more",
      detail: `Yours in ${answers(usedYours)}, theirs in ${count(usedTheirs)}.`,
      text: `AI used your website in ${answers(usedYours)}, and ${possessive(them.name)} in ${count(usedTheirs)}.`,
      where: "website",
      weight: usedYours - usedTheirs,
    });
  }
  return { behind, ahead };
}

/** Review sites, directories and news sites AI used in answers that named them and not you. */
export function siteFacts(checks: StandingCheck[], tracked: string, name = tracked): Fact[] {
  const lost = checks.filter((c) => namedIn(c, tracked) && !c.youNamed);
  const used = new Map<string, number>();
  for (const check of lost) for (const host of check.sites) used.set(host, (used.get(host) ?? 0) + 1);
  const facts: Fact[] = [];
  for (const [host, n] of [...used].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (n < MIN_ANSWERS) break;
    const type = sourceType(host, null);
    if (type === "reviews" || type === "directories") {
      facts.push({
        title: `AI used ${host} when it picked them`,
        detail: `${answers(n)} without you. Check your listing there.`,
        text: `AI used ${host} in ${answers(n)} that named ${name} and not you. Check your listing there.`,
        where: "other_places",
        weight: n,
      });
    } else if (type === "news") {
      facts.push({
        title: `AI cited articles on ${host}`,
        detail: `${answers(n)} named them and not you.`,
        text: `AI used articles on ${host} in ${answers(n)} that named ${name} and not you.`,
        where: "other_places",
        weight: 0.8 * n,
      });
    }
    if (facts.length === MAX_SITES) break;
  }
  return facts;
}

/** Who is ahead on Google, worked out the same way as the explanation's facts (insights/compare.ts, BUG-099). */
export function googleFacts(name: string, theirs: GoogleValues | null, yours: GoogleValues | null): { behind: Fact[]; ahead: Fact[] } {
  const behind: Fact[] = [];
  const ahead: Fact[] = [];
  if (!theirs || !yours) return { behind, ahead };
  const reviews = sideOf(compareCount(theirs.reviewCount, yours.reviewCount));
  if (reviews !== "about_same" && reviews !== "unknown") {
    const t = count(theirs.reviewCount!);
    const y = count(yours.reviewCount!);
    const text = `${name} has ${t} Google reviews, you have ${y}.`;
    if (reviews === "they_are_ahead") behind.push({ title: "More Google reviews", detail: `${t} vs your ${y}`, text, where: "google_listing", weight: 3 });
    else ahead.push({ title: "You have more Google reviews", detail: `${y} vs their ${t}`, text, where: "google_listing", weight: 3 });
  }
  const rating = sideOf(compareRating(theirs.rating, yours.rating));
  if (rating !== "about_same" && rating !== "unknown") {
    const t = theirs.rating!.toFixed(1);
    const y = yours.rating!.toFixed(1);
    const text = `${name} is rated ${t} on Google, you are rated ${y}.`;
    if (rating === "they_are_ahead") behind.push({ title: "Higher Google rating", detail: `${t} vs your ${y}`, text, where: "google_listing", weight: 2 });
    else ahead.push({ title: "Your Google rating is higher", detail: `${y} vs their ${t}`, text, where: "google_listing", weight: 2 });
  }
  const theirDays = openDays(theirs.hours);
  const yourDays = openDays(yours.hours);
  const days = sideOf(compareCount(theirDays, yourDays, 0));
  if (days !== "about_same" && days !== "unknown") {
    const text = `Google shows ${name} open ${theirDays} days a week, and you ${yourDays}.`;
    if (days === "they_are_ahead") behind.push({ title: "Open more days on Google", detail: `${theirDays} days vs your ${yourDays}`, text, where: "google_listing", weight: 1.5 });
    else ahead.push({ title: "You're open more days", detail: `${yourDays} days vs their ${theirDays}`, text, where: "google_listing", weight: 1.5 });
  }
  const theirType = theirs.categories[0];
  const yourType = yours.categories[0];
  const shared = theirs.categories.some((t) => yours.categories.some((y) => t.toLowerCase() === y.toLowerCase()));
  if (theirType && yourType && !shared) {
    behind.push({
      title: "Different Google category",
      detail: `Theirs: ${theirType}. Yours: ${yourType}.`,
      text: `Google lists ${name} as "${theirType}" and you as "${yourType}". AI may match the question to their category.`,
      where: "google_listing",
      weight: 2,
    });
  }
  return { behind, ahead };
}
