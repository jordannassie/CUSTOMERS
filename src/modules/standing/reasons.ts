// Likely reasons AI names a competitor more or less than you, from what AI could see: the sites it used in its
// answers, and Google values shown live (D-73). Pure. We cannot see inside the AI tools, so each one is a likely
// reason backed by a fact, never "the" reason.
import type { Where } from "@/lib/fix-where";
import { compareCount, compareRating, openDays, sideOf } from "@/lib/google-compare";
import { hostOf, isOwnSite, siteOwner, sourceType } from "@/lib/site-type";
import { namedIn, type StandingCheck } from "./checks";

export type { Where };

/**
 * title and detail: the short form screens show ("More Google reviews", "320 vs your 12"). text: the same fact as one
 * full sentence, for the report, its PDF and the weekly email.
 */
/**
 * action: the one step to take, said plainly ("Claim or update your listing on yelp.com"). match: the words a saved fix
 * must contain to be the fix for this reason (the site, the service, the topic); fixId: that saved fix, when there is one.
 */
export type Fact = {
  title: string;
  detail: string;
  text: string;
  where: Where | null;
  weight: number;
  action?: string;
  match?: string[];
  fixId?: string;
  /**
   * key: stable across scans, shared with Actions ("site:yelp.com"), so "Add to Actions" finds a fix already added.
   * answers: how many answers the fact rests on ("Based on 9 answers"); basis says what else it rests on.
   */
  key?: string;
  answers?: number;
  basis?: "answers" | "website" | "google";
  /** For an AI tool's reason: the tool, so a card can say "ChatGPT and Claude used it most" when merged. */
  assistant?: string;
  /** The AI tool a per-AI fact is about ("openai"), so "See the answers" shows that tool's answers only. */
  provider?: string;
};

/** Google values for one business, fetched live for this page view and never stored (D-73). */
export type GoogleValues = { rating: number | null; reviewCount: number | null; hours: string[] | null; categories: string[] };

const MIN_ANSWERS = 2;
/** "yelp" from "yelp.com", "m.yelp.co.uk": the name a fix would use for the site. */
const brandOf = (host: string) => host.replace(/^(www|m)\./, "").split(".")[0];
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
      action: "Let AI tools read your website: open your robots.txt and bot protection settings and allow GPTBot, ClaudeBot and PerplexityBot.",
      match: ["robots", "gptbot", "claudebot", "perplexitybot", "crawler", "bot protection"],
      text: "Your website turned our reader away, so AI tools may not be able to read it either.",
      key: "web:blocked",
      basis: "website",
      where: "website",
      weight: 4,
    });
  }
  if (them.site && usedTheirs >= MIN_ANSWERS && usedTheirs > usedYours) {
    const yours = you.domain ? ` It used yours in ${answers(usedYours)}.` : "";
    behind.push({
      title: "AI quotes their website more",
      action: "Give each service its own clear page on your website that answers what customers ask, so AI has something of yours to quote.",
      match: ["service page", "services page", "dedicated page", "landing page", "own page"],
      detail: you.domain ? `${them.site} in ${answers(usedTheirs)}, yours in ${count(usedYours)}.` : `${them.site} in ${answers(usedTheirs)}.`,
      text: `AI used ${possessive(them.name)} website (${them.site}) in ${answers(usedTheirs)}.${yours} AI tools often read business websites for questions like these.`,
      where: "website",
      weight: 1.5 * (usedTheirs - usedYours),
      key: "web:quoted",
      answers: usedTheirs,
      basis: "answers",
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
        detail: `${answers(n)} without you.`,
        action: `Claim or update your listing on ${host}: same name, address, phone and website as everywhere else.`,
        match: [host, brandOf(host)],
        text: `AI used ${host} in ${answers(n)} that named ${name} and not you. Check your listing there.`,
        where: "other_places",
        weight: n,
        key: `site:${host}`,
        answers: n,
        basis: "answers",
      });
    } else if (type === "news") {
      facts.push({
        title: `AI cited articles on ${host}`,
        detail: `${answers(n)} named them and not you.`,
        action: `Get a mention on ${host}: local news often runs a story or an expert quote from a local business.`,
        match: [host, brandOf(host)],
        text: `AI used articles on ${host} in ${answers(n)} that named ${name} and not you.`,
        where: "other_places",
        weight: 0.8 * n,
        key: `site:${host}`,
        answers: n,
        basis: "answers",
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
    if (reviews === "they_are_ahead")
      behind.push({
        title: "More Google reviews",
        detail: `${t} vs your ${y}`,
        text,
        where: "google_listing",
        weight: 3,
        action: "Ask happy customers for a Google review: send them your review link after each visit or sale.",
        match: ["review"],
        key: "google:reviews",
        basis: "google",
      });
    else ahead.push({ title: "You have more Google reviews", detail: `${y} vs their ${t}`, text, where: "google_listing", weight: 3 });
  }
  const rating = sideOf(compareRating(theirs.rating, yours.rating));
  if (rating !== "about_same" && rating !== "unknown") {
    const t = theirs.rating!.toFixed(1);
    const y = yours.rating!.toFixed(1);
    const text = `${name} is rated ${t} on Google, you are rated ${y}.`;
    if (rating === "they_are_ahead")
      behind.push({
        title: "Higher Google rating",
        detail: `${t} vs your ${y}`,
        text,
        where: "google_listing",
        weight: 2,
        action: "Reply to every Google review and fix what low ratings mention; new good reviews lift the rating over time.",
        match: ["rating", "review"],
        key: "google:rating",
        basis: "google",
      });
    else ahead.push({ title: "Your Google rating is higher", detail: `${y} vs their ${t}`, text, where: "google_listing", weight: 2 });
  }
  const theirDays = openDays(theirs.hours);
  const yourDays = openDays(yours.hours);
  const days = sideOf(compareCount(theirDays, yourDays, 0));
  if (days !== "about_same" && days !== "unknown") {
    const text = `Google shows ${name} open ${theirDays} days a week, and you ${yourDays}.`;
    if (days === "they_are_ahead")
      behind.push({
        title: "Open more days on Google",
        detail: `${theirDays} days vs your ${yourDays}`,
        text,
        where: "google_listing",
        weight: 1.5,
        action: "Check your opening hours on your Google listing are complete, including weekends and holidays.",
        match: ["hours", "open days", "opening"],
        key: "google:hours",
        basis: "google",
      });
    else ahead.push({ title: "You're open more days", detail: `${yourDays} days vs their ${theirDays}`, text, where: "google_listing", weight: 1.5 });
  }
  const theirType = theirs.categories[0];
  const yourType = yours.categories[0];
  const shared = theirs.categories.some((t) => yours.categories.some((y) => t.toLowerCase() === y.toLowerCase()));
  if (theirType && yourType && !shared) {
    behind.push({
      title: "Their Google category may fit better",
      detail: `Theirs: ${theirType}. Yours: ${yourType}.`,
      action: `Check your Google categories: add "${theirType}" as a category if it describes what you do.`,
      match: ["category"],
      key: "google:category",
      basis: "google",
      text: `Google lists ${name} as "${theirType}" and you as "${yourType}". AI may match the question to their category.`,
      where: "google_listing",
      weight: 2,
    });
  }
  return { behind, ahead };
}
