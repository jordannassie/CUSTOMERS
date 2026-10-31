// What holds the business back, found by fixed rules over the report's counts (analysis.ts), each scored for priority
// and turned into a numbered fix with template wording. The same answers always give the same fixes in the same
// order. Every evidence line quotes real counts. Pure.
import { listings, topRival, type Analysis, type SourceStat, type ThemeStat } from "./analysis";
import { listingWording, NO_SITE_WORDING, OWNERS, ownSiteLowWording, ownSiteWording, themeAreas, themeWording, type Wording } from "./issue-templates";
import { PRIORITIES, type Priority, type ReportArea, type ReportFix } from "./snapshot-schema";
import { slug } from "./text";
import { THEME_WORDS } from "./themes";

type Level = ReportFix["impact"];

export type Issue = Omit<ReportFix, "n" | "wording"> & {
  /** Sort score inside a priority: impact, effort and whether every answer missed you. */
  points: number;
  /** Answers the issue covers. */
  reach: number;
  /** The site named in each area, for the area cards ("Foodpanda" rather than "Delivery apps"). */
  labels: Partial<Record<ReportArea, string>>;
};

export const MAX_FIXES = 6;
const LOW_SHARE = 0.25;
const MIN_THEME_ANSWERS = 4;
const THEME_LOW_SHARE = 0.2;
// Some places are where the fix is quick: a listing is a form, a website is a project.
const EFFORT: Record<ReportArea, Level> = { website: "medium", google: "low", delivery: "low", reviews: "medium", blogs: "medium", social: "medium", directories: "low", other: "medium" };
const LEVEL_POINTS: Record<Level, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_POINTS: Record<Level, number> = { low: 1, medium: 0, high: -1 };

export const minSourceAnswers = (total: number) => Math.max(3, Math.ceil(total * 0.08));

/** How many of all answers the issue touches: a quarter or more is high, a tenth or more medium. */
export function impactOf(reach: number, total: number): Level {
  const share = total === 0 ? 0 : reach / total;
  return share >= 0.25 ? "high" : share >= 0.1 ? "medium" : "low";
}

const bump = (level: Level): Level => (level === "low" ? "medium" : "high");

export function priorityOf(points: number): Priority {
  return points >= 4 ? "high" : points === 3 ? "medium" : "low";
}

/** `fixed`: a priority set by the rule itself (your own website), not by the points. */
function scored(base: Omit<Issue, "points" | "priority">, missedAll: boolean, fixed?: Priority): Issue {
  const points = LEVEL_POINTS[base.impact] + EFFORT_POINTS[base.effort] + (missedAll ? 1 : 0);
  return { ...base, points, priority: fixed ?? priorityOf(points) };
}

const goal = (label: ReportFix["goal"]["label"], text: string) => ({ label, text });
const nameOrNone = (n: number) => (n === 0 ? "none" : String(n));

function ownSite(a: Analysis): Issue | null {
  const top = a.otherSiteRows.slice(0, 2);
  const others =
    a.otherSites === 0
      ? ""
      : top.length === 2 && top[0].answers === top[1].answers
        ? ` Other business websites, ${top[0].host} and ${top[1].host}, were used in ${top[0].answers} answers each.`
        : ` Other business websites were used in ${a.otherSites} answers, ${top[0].host} in ${top[0].answers} of them.`;
  const base = { areas: ["website"] as ReportArea[], where: "Your website", owner: OWNERS.website, reach: a.total, labels: {} };
  if (!a.domain) {
    const evidence = `No website is saved for ${a.name}, so AI can only use what other sites say about you.${others}`;
    return scored({ ...base, key: "no_site", ...NO_SITE_WORDING, impact: "high", effort: "high", evidence, goal: goal("Done when", "Your website appears as a source in the next scan") }, true, "critical");
  }
  if (a.ownCited === 0) {
    const evidence = `${a.domain} was used in 0 of ${a.total} answers.${others}`;
    return scored({ ...base, key: "own_site_uncited", ...ownSiteWording(a.domain), impact: "high", effort: "medium", evidence, goal: goal("Done when", `${a.domain} appears as a source in the next scan`) }, true, "critical");
  }
  if (a.ownCited / a.total >= 0.1) return null;
  const target = Math.min(a.total, Math.max(a.ownCited * 2, Math.ceil(a.total * 0.1)));
  return scored(
    {
      ...base,
      key: "own_site_low",
      ...ownSiteLowWording(a.domain),
      impact: "high",
      effort: "medium",
      evidence: `${a.domain} was used in ${a.ownCited} of ${a.total} answers.${others}`,
      goal: goal("Target for next scan", `Used as a source in ${target} or more answers`),
    },
    false,
    "high",
  );
}

function listingIssue(a: Analysis, s: SourceStat, key: string, wording: Wording, evidence: string, target: number): Issue {
  const impact = s.area === "google" ? bump(impactOf(s.answers, a.total)) : impactOf(s.answers, a.total);
  const done = s.you === 0;
  return scored(
    {
      key,
      ...wording,
      areas: [s.area],
      where: s.area === "google" ? "Google Business Profile" : s.label,
      impact,
      effort: EFFORT[s.area],
      owner: OWNERS[s.area],
      evidence,
      goal: done
        ? goal("Done when", s.area === "google" ? `Google sourced answers start naming ${a.name}` : `At least one ${s.label} sourced answer names ${a.name}`)
        : goal("Target for next scan", `Named in ${target} or more ${s.label} sourced answers`),
      reach: s.answers,
      labels: { [s.area]: s.area === "google" ? "Google Business Profile" : s.label },
    },
    done,
  );
}

function sourceIssue(a: Analysis, s: SourceStat): Issue | null {
  const rival = topRival(s);
  if (s.answers < minSourceAnswers(a.total)) return null;
  if (s.you > 0 && !(s.you / s.answers < LOW_SHARE && rival)) return null;
  const evidence = `${s.label} was used in ${s.answers} answers and named you in ${nameOrNone(s.you)}.${rival ? ` ${rival.count} of those answers named ${rival.name}.` : ""}`;
  const target = Math.min(s.answers, Math.max(s.you * 2, s.you + 2));
  return listingIssue(a, s, `source:${s.key}`, listingWording(s.area, s.label, a.name, a.market, s.you), evidence, target);
}

function themeIssue(a: Analysis, t: ThemeStat): Issue | null {
  if (t.id === "other" || t.answers < MIN_THEME_ANSWERS || t.you / t.answers >= THEME_LOW_SHARE) return null;
  const rival = topRival(t);
  if (t.you > 0 && !rival) return null;
  const noun = THEME_WORDS[t.id].noun;
  const delivery = a.sources.some((s) => s.area === "delivery" && s.answers >= minSourceAnswers(a.total));
  const blog = listings(a).find((s) => s.area === "blogs" && s.you > 0);
  const areas = themeAreas(t.id, { delivery });
  const target = Math.min(t.answers, Math.max(t.you + 1, Math.ceil(t.answers * 0.2)));
  // The site AI used most in each listing area, so the where line and the area cards can name it.
  const labels: Issue["labels"] = Object.fromEntries(
    areas.flatMap((area) => {
      const site = area === "blogs" ? blog : listings(a).find((s) => s.area === area && area !== "google" && s.answers >= minSourceAnswers(a.total));
      return site ? [[area, site.label]] : [];
    }),
  );
  return scored(
    {
      key: `theme:${t.id}`,
      ...themeWording(t.id, { delivery, blog: blog ? { label: blog.label, you: blog.you, answers: blog.answers } : null }),
      areas,
      where: whereOf(areas, labels),
      impact: impactOf(t.answers, a.total),
      effort: "medium",
      owner: t.id === "speed" ? "Operations" : "Marketing",
      evidence: `Named in ${t.you} of ${t.answers} ${noun} answers.${rival ? ` ${rival.name} was named in ${rival.count}.` : ""}`,
      goal: goal("Target for next scan", `Named in ${target} or more of ${t.answers} ${noun} answers`),
      reach: t.answers,
      labels,
    },
    t.you === 0,
  );
}

const SHORT: Record<ReportArea, string> = { website: "Website", google: "Google", delivery: "delivery apps", reviews: "review sites", blogs: "blogs and guides", social: "social", directories: "directories", other: "other sites" };

/** "Website, blogs and guides, TripAdvisor": a listing area by its site's name when it has one. */
export function whereOf(areas: ReportArea[], labels: Issue["labels"] = {}): string {
  const words = areas.map((area) => (area !== "blogs" && labels[area]) || SHORT[area]);
  return words.join(", ").replace(/^./, (c) => c.toUpperCase());
}

/** A competitor ahead of you that wins through one listing: most of its answers there, few of yours. */
function rivalSources(a: Analysis, found: Issue[]): Issue[] {
  const out: Issue[] = [];
  for (const rival of a.ahead.slice(0, 2)) {
    const s = listings(a)
      .filter((x) => (x.rivals[rival.name] ?? 0) >= 3 && (x.rivals[rival.name] ?? 0) - x.you >= 2)
      .sort((x, y) => y.rivals[rival.name] - x.rivals[rival.name] || x.key.localeCompare(y.key))[0];
    if (!s) continue;
    const them = s.rivals[rival.name];
    const existing = found.find((i) => i.key === `source:${s.key}`) ?? out.find((i) => i.key.endsWith(`:${s.key}`));
    if (existing) {
      if (!existing.evidence.includes(rival.name)) existing.evidence += ` ${rival.name} was named in ${them} of them.`;
      continue;
    }
    const evidence = `${s.label} was used in ${them} answers that named ${rival.name}, and named you in ${s.you} of its ${s.answers} answers.`;
    const wording = { ...listingWording(s.area, s.label, a.name, a.market, s.you), title: `Catch up with ${rival.name} on ${s.label}` };
    out.push(listingIssue(a, s, `rival:${slug(rival.name)}:${s.key}`, wording, evidence, Math.min(s.answers, s.you + 2)));
  }
  return out;
}

/** Every issue the rules find, unranked. */
export function detectIssues(a: Analysis): Issue[] {
  if (a.total === 0) return [];
  const found: Issue[] = [];
  const own = ownSite(a);
  if (own) found.push(own);
  for (const s of listings(a)) {
    const issue = sourceIssue(a, s);
    if (issue) found.push(issue);
  }
  for (const t of a.themes) {
    const issue = themeIssue(a, t);
    if (issue) found.push(issue);
  }
  return [...found, ...rivalSources(a, found)];
}

/** Critical first, then by points, then by the answers covered; the key breaks ties so the order never changes. */
export function rankIssues(issues: Issue[]): Issue[] {
  return [...issues].sort(
    (x, y) => PRIORITIES.indexOf(x.priority) - PRIORITIES.indexOf(y.priority) || y.points - x.points || y.reach - x.reach || x.key.localeCompare(y.key),
  );
}

/** The issues that become fixes: the top 6 in priority order. */
export const topIssues = (issues: Issue[]) => rankIssues(issues).slice(0, MAX_FIXES);

/** Numbered fixes from topIssues, with template wording. */
export function toFixes(top: Issue[]): ReportFix[] {
  return top.map((i, index) => ({
    n: index + 1,
    key: i.key,
    title: i.title,
    areas: i.areas,
    where: i.where,
    priority: i.priority,
    impact: i.impact,
    effort: i.effort,
    owner: i.owner,
    evidence: i.evidence,
    why: i.why,
    steps: i.steps,
    goal: i.goal,
    wording: "template" as const,
  }));
}
