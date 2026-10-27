// Where the score gap with a competitor comes from: the same saved answers the score counts, split by the kind of site
// AI used for each one, and a short "who leads where" across the places AI looks. Pure. Every number here is a count of
// answers or a fact read on a page; nothing is estimated.
import { compareCount, compareRating, openDays, sideOf } from "@/lib/google-compare";
import { hostOf, isOwnSite, sourceType } from "@/lib/site-type";
import { namedIn, type StandingCheck } from "./checks";
import type { GoogleValues } from "./reasons";
import type { SignalSet } from "./site-signals";

export type SourceKey = "listings" | "their_site" | "your_site" | "other_sites" | "news" | "none";

/** Answers that used this kind of site, and how many of them named them and you. */
export type SourceRow = { key: SourceKey; label: string; answers: number; them: number; you: number; hosts: string[] };

const SOURCE_LABEL: Record<SourceKey, string> = {
  listings: "Review sites and directories",
  their_site: "Their website",
  your_site: "Your website",
  other_sites: "Other business websites",
  news: "News and articles",
  none: "No websites cited",
};
const MAX_HOSTS = 3;

function kindsOf(check: StandingCheck, ownDomain: string | null, theirSite: string | null): Map<SourceKey, string[]> {
  const kinds = new Map<SourceKey, string[]>();
  const add = (k: SourceKey, host: string) => kinds.set(k, [...(kinds.get(k) ?? []), host]);
  for (const host of check.sites) {
    if (theirSite && (host === theirSite || host.endsWith(`.${theirSite}`))) add("their_site", host);
    else if (isOwnSite(host, ownDomain)) add("your_site", host);
    else {
      const type = sourceType(host, null);
      add(type === "reviews" || type === "directories" ? "listings" : type === "news" ? "news" : "other_sites", host);
    }
  }
  if (check.sites.length === 0) kinds.set("none", []);
  return kinds;
}

/** The score's answers, split by the kinds of site each one used; an answer can use more than one kind. */
export function sourceBreakdown(checks: StandingCheck[], tracked: string, ownDomain: string | null, theirSite: string | null): SourceRow[] {
  const rows = new Map<SourceKey, { answers: number; them: number; you: number; hosts: Map<string, number> }>();
  for (const check of checks) {
    for (const [key, hosts] of kindsOf(check, ownDomain, theirSite)) {
      const r = rows.get(key) ?? { answers: 0, them: 0, you: 0, hosts: new Map<string, number>() };
      r.answers += 1;
      if (namedIn(check, tracked)) r.them += 1;
      if (check.youNamed) r.you += 1;
      for (const h of new Set(hosts)) r.hosts.set(h, (r.hosts.get(h) ?? 0) + 1);
      rows.set(key, r);
    }
  }
  return [...rows]
    .map(([key, r]) => ({
      key,
      label: SOURCE_LABEL[key],
      answers: r.answers,
      them: r.them,
      you: r.you,
      hosts: [...r.hosts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, MAX_HOSTS).map(([h]) => h),
    }))
    .sort((a, b) => b.them - b.you - (a.them - a.you) || b.answers - a.answers);
}

/** Pages of one site the answers cited, with how many answers used each. */
export function pagesUsed(checks: StandingCheck[], site: string | null, max = 4): { path: string; answers: number }[] {
  if (!site) return [];
  const counts = new Map<string, number>();
  for (const check of checks) {
    const paths = new Set<string>();
    for (const url of check.urls ?? []) {
      const host = hostOf(url);
      if (!host || !(host === site || host.endsWith(`.${site}`))) continue;
      try {
        paths.add(new URL(/^https?:/i.test(url) ? url : `https://${url}`).pathname.replace(/\/$/, "") || "/");
      } catch {
        continue;
      }
    }
    for (const p of paths) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([path, answers]) => ({ path, answers }));
}

export type Lead = "them" | "you" | "even" | "unknown";
export type Area = { key: "listings" | "quotes" | "google" | "website"; label: string; lead: Lead; detail: string };

const rate = (n: number, of: number) => (of === 0 ? 0 : n / of);
const leadOf = (them: number, you: number): Lead => (them > you ? "them" : you > them ? "you" : "even");
const answers = (n: number) => `${n} ${n === 1 ? "answer" : "answers"}`;

/** Review sites and directories: who AI named more when it used them. */
export function listingsArea(rows: SourceRow[]): Area {
  const r = rows.find((x) => x.key === "listings");
  const label = "Review sites and directories";
  if (!r) return { key: "listings", label, lead: "unknown", detail: "AI didn't use any in these answers." };
  const hosts = r.hosts.length ? ` (${r.hosts.join(", ")})` : "";
  return {
    key: "listings",
    label,
    lead: leadOf(rate(r.them, r.answers), rate(r.you, r.answers)),
    detail: `In ${answers(r.answers)} that used them${hosts}, AI named them in ${r.them} and you in ${r.you}.`,
  };
}

/** AI quoting each business's own website. */
export function quotesArea(usedTheirs: number, usedYours: number, site: string | null, youHaveSite: boolean): Area {
  const label = "AI quoting each website";
  if (!site && !youHaveSite) return { key: "quotes", label, lead: "unknown", detail: "We don't know their website yet." };
  return {
    key: "quotes",
    label,
    lead: leadOf(usedTheirs, usedYours),
    detail: `AI used their website in ${answers(usedTheirs)} and yours in ${usedYours}.`,
  };
}

/** Their Google listing against yours, live for this view only (D-73). */
export function googleArea(theirs: GoogleValues | null, yours: GoogleValues | null): Area {
  const label = "Google listing";
  if (!theirs || !yours) return { key: "google", label, lead: "unknown", detail: "Google details aren't available for both of you right now." };
  const sides = [
    sideOf(compareCount(theirs.reviewCount, yours.reviewCount)),
    sideOf(compareRating(theirs.rating, yours.rating)),
    sideOf(compareCount(openDays(theirs.hours), openDays(yours.hours), 0)),
  ];
  const them = sides.filter((s) => s === "they_are_ahead").length;
  const you = sides.filter((s) => s === "you_are_ahead").length;
  const reviews = `${(theirs.reviewCount ?? 0).toLocaleString("en-US")} reviews vs your ${(yours.reviewCount ?? 0).toLocaleString("en-US")}`;
  const stars = theirs.rating !== null && yours.rating !== null ? `, rated ${theirs.rating.toFixed(1)} vs ${yours.rating.toFixed(1)}` : "";
  return { key: "google", label, lead: leadOf(them, you), detail: `${reviews}${stars}.` };
}

const SIGNAL_LABEL: Record<Exclude<keyof SignalSet, "words" | "aiBlocked">, string> = {
  businessSchema: "business details for AI",
  faq: "an FAQ",
  reviews: "reviews",
  hours: "opening hours",
  contactForm: "a contact form",
};

/** The two websites, after a check read both: what each shows that the other doesn't. */
export function websiteArea(
  read: { theirs: SignalSet; yours: SignalSet; servicesOnlyThem: number; claimsOnlyThem: number } | null,
): Area {
  const label = "The websites";
  if (!read) return { key: "website", label, lead: "unknown", detail: "Check their website to compare the two." };
  const keys = Object.keys(SIGNAL_LABEL) as (keyof typeof SIGNAL_LABEL)[];
  const them = keys.filter((k) => read.theirs[k] && !read.yours[k]).map((k) => SIGNAL_LABEL[k]);
  const you = keys.filter((k) => read.yours[k] && !read.theirs[k]).map((k) => SIGNAL_LABEL[k]);
  if (read.servicesOnlyThem > 0) them.push(`${read.servicesOnlyThem} ${read.servicesOnlyThem === 1 ? "service" : "services"} yours doesn't list`);
  if (read.claimsOnlyThem > 0) them.push(`${read.claimsOnlyThem} ${read.claimsOnlyThem === 1 ? "claim" : "claims"} questions ask about`);
  if (read.yours.aiBlocked?.length && read.theirs.aiBlocked?.length === 0) them.push("lets AI tools in");
  if (read.theirs.aiBlocked?.length && read.yours.aiBlocked?.length === 0) you.push("lets AI tools in");
  const detail = [them.length ? `Only theirs: ${them.join(", ")}.` : "", you.length ? `Only yours: ${you.join(", ")}.` : ""].filter(Boolean).join(" ");
  return { key: "website", label, lead: leadOf(them.length, you.length), detail: detail || "Both show the same things on the pages we read." };
}
