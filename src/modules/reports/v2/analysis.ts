// The counts every report section reads, worked out once from the score's own answers (standing/loadStanding: the
// last 30 days, suggested questions, the business's AI tools), so no two sections can count the same thing twice.
// Every number is a count of answers. Pure.
import { siteOwner } from "@/lib/site-type";
import type { StandingCheck } from "@/modules/standing";
import { isListing, sourceOf, type SourceRef } from "./sources";
import { THEMES, themeOf, type ThemeId } from "./themes";

/** A tracked competitor as the leaderboard shows it: `name` is the name AI uses, `names` the tracked names it counts. */
export type Rival = { name: string; names: string[]; domain: string | null; score: number | null; collecting: boolean };

export type AnalysisInput = {
  business: { name: string; domain: string | null; market: string | null };
  checks: StandingCheck[];
  /** Question id to its wording now. */
  questions: Map<string, string>;
  rivals: Rival[];
  /** Your 30-day score as the leaderboard shows it; null before the first scan. */
  youScore: number | null;
};

/** Answers in a group, how many named you, and how many named each competitor (by its `name`). */
export type Counts = { answers: number; you: number; rivals: Record<string, number> };
export type SourceStat = SourceRef & Counts & { hosts: string[] };
export type ThemeStat = Counts & { id: ThemeId; questions: number };
export type RivalStat = Rival & { mentions: number };

export type Analysis = {
  name: string;
  domain: string | null;
  market: string | null;
  total: number;
  named: number;
  questions: number;
  namedQuestions: number;
  /** Answers that used your own website. */
  ownCited: number;
  /** Answers that used another business's website, and those sites by answers. */
  otherSites: number;
  otherSiteRows: { host: string; answers: number }[];
  /** Every source, most used first. */
  sources: SourceStat[];
  /** Themes with answers, in THEMES order. */
  themes: ThemeStat[];
  rivals: RivalStat[];
  /** Competitors with a higher score than yours (the leaderboard's rule), highest first. */
  ahead: RivalStat[];
};

const key = (name: string) => name.trim().toLowerCase();

function namesRival(check: StandingCheck, rival: Rival): boolean {
  const wanted = new Set(rival.names.map(key));
  return check.competitors.some((n) => wanted.has(key(n)));
}

const empty = (): Counts => ({ answers: 0, you: 0, rivals: {} });

function add(counts: Counts, check: StandingCheck, named: string[]) {
  counts.answers += 1;
  if (check.youNamed) counts.you += 1;
  for (const n of named) counts.rivals[n] = (counts.rivals[n] ?? 0) + 1;
}

const isTheirSite = (host: string, rivals: Rival[]) =>
  rivals.some((r) => (r.domain && (host === r.domain || host.endsWith(`.${r.domain}`))) || siteOwner(host, [r.name, ...r.names]) !== null);

export function analyse(input: AnalysisInput): Analysis {
  const { checks, business, rivals } = input;
  const sources = new Map<string, SourceStat>();
  const themes = new Map<ThemeId, ThemeStat & { ids: Set<string> }>();
  const others = new Map<string, number>();
  let ownCited = 0;
  let otherSites = 0;
  for (const check of checks) {
    const named = rivals.filter((r) => namesRival(check, r)).map((r) => r.name);
    const theme = themeOf(input.questions.get(check.questionId) ?? "");
    const t = themes.get(theme) ?? { ...empty(), id: theme, questions: 0, ids: new Set<string>() };
    add(t, check, named);
    t.ids.add(check.questionId);
    themes.set(theme, t);

    const seen = new Set<string>();
    let usedOwn = false;
    let usedOther = false;
    for (const host of new Set(check.sites)) {
      const ref = sourceOf(host, business.domain, isTheirSite(host, rivals));
      if (ref.area === "website") usedOwn = true;
      if (ref.area === "other") {
        usedOther = true;
        others.set(host, (others.get(host) ?? 0) + 1);
      }
      const stat = sources.get(ref.key) ?? { ...ref, ...empty(), hosts: [] };
      if (!stat.hosts.includes(host)) stat.hosts.push(host);
      // An answer that cited two Google hosts used Google once.
      if (!seen.has(ref.key)) add(stat, check, named);
      seen.add(ref.key);
      sources.set(ref.key, stat);
    }
    if (usedOwn) ownCited += 1;
    if (usedOther) otherSites += 1;
  }

  const rivalStats = rivals.map((r) => ({ ...r, mentions: checks.filter((c) => namesRival(c, r)).length }));
  const you = input.youScore;
  const ahead = you === null ? [] : rivalStats.filter((r) => !r.collecting && r.score !== null && r.score > you).sort((a, b) => b.score! - a.score!);
  return {
    name: business.name,
    domain: business.domain,
    market: business.market,
    total: checks.length,
    named: checks.filter((c) => c.youNamed).length,
    questions: new Set(checks.map((c) => c.questionId)).size,
    namedQuestions: new Set(checks.filter((c) => c.youNamed).map((c) => c.questionId)).size,
    ownCited,
    otherSites,
    otherSiteRows: [...others].map(([host, answers]) => ({ host, answers })).sort((a, b) => b.answers - a.answers || a.host.localeCompare(b.host)),
    sources: [...sources.values()].sort((a, b) => b.answers - a.answers || a.key.localeCompare(b.key)),
    themes: THEMES.flatMap((id) => {
      const t = themes.get(id);
      if (!t) return [];
      const { ids, ...stat } = t;
      return [{ ...stat, questions: ids.size }];
    }),
    rivals: rivalStats,
    ahead,
  };
}

/** Listing sources (Google, delivery apps, review sites, guides, social, directories), most used first. */
export const listings = (a: Analysis) => a.sources.filter((s) => isListing(s.area));

/** The competitor named most in a group, when it was named more than you; null otherwise. */
export function topRival(counts: Counts): { name: string; count: number } | null {
  const best = Object.entries(counts.rivals).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
  return best && best[1] > counts.you ? { name: best[0], count: best[1] } : null;
}
