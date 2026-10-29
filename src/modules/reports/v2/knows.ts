// "What AI knows about you": what it names you for, who names you, where it found you, and what it does not know
// (each gap with its evidence and the fix that fills it). Counts come from analysis.ts. Pure.
import type { Analysis, SourceStat, ThemeStat } from "./analysis";
import type { Issue } from "./issues";
import type { ReportSnapshot } from "./snapshot-schema";
import { list } from "./text";
import { THEME_WORDS } from "./themes";

type Knows = ReportSnapshot["knows"];
type Card = NonNullable<Knows["knownFor"]>;

const MAX_GAPS = 4;
const label = (s: SourceStat) => (s.area === "website" ? "Your website" : s.label);
const namedYou = (n: number) => (n === 0 ? "none named you" : `${n} named you`);

/** The theme with the most answers naming you; "other" only when no named theme has any. */
export function knownTheme(a: Analysis): ThemeStat | null {
  const named = a.themes.filter((t) => t.you > 0).sort((x, y) => y.you - x.you || y.you / y.answers - x.you / x.answers);
  return named.find((t) => t.id !== "other") ?? named[0] ?? null;
}

const themeAnswers = (t: ThemeStat) => (t.id === "other" ? `answers to other questions` : `${THEME_WORDS[t.id].noun} answers`);

function knownFor(a: Analysis): Card | null {
  const t = knownTheme(a);
  return t && { title: THEME_WORDS[t.id].known, detail: `Named in ${t.you} of ${t.answers} ${themeAnswers(t)}.` };
}

/** The site that named you in the biggest part of its answers (at least 2 answers). */
export function trustedSource(a: Analysis): SourceStat | null {
  return (
    a.sources
      .filter((s) => s.area !== "website" && s.area !== "other" && s.answers >= 2 && s.you > 0)
      .sort((x, y) => y.you / y.answers - x.you / x.answers || y.you - x.you || x.key.localeCompare(y.key))[0] ?? null
  );
}

/** The sites used most in the answers that named you (your own site included, other businesses' sites not). */
export function foundSources(a: Analysis, max = 2): SourceStat[] {
  return a.sources
    .filter((s) => s.area !== "other" && s.you > 0)
    .sort((x, y) => y.you - x.you || x.key.localeCompare(y.key))
    .slice(0, max);
}

function foundThrough(a: Analysis): Card | null {
  const top = foundSources(a);
  if (top.length === 0) return null;
  const [first, second] = top;
  const detail = !second
    ? `${label(first)} was used in ${first.you} of the ${a.named} answers naming you.`
    : first.you === second.you
      ? `${first.you} of the ${a.named} answers naming you came through each of these sites.`
      : `${label(first)} was used in ${first.you} of the ${a.named} answers naming you, ${label(second)} in ${second.you}.`;
  return { title: list(top.map(label)), detail };
}

const sourceKey = (key: string) => key.split(":").at(-1)!;

function gapFor(a: Analysis, issue: Issue): { title: string; evidence: string } | null {
  if (issue.key === "no_site") return { title: "Your own website", evidence: "No website is saved, so AI has none of your own pages to read." };
  if (issue.key === "own_site_uncited") return { title: "Your services, prices and locations", evidence: "Your website was never used as a source." };
  if (issue.key === "own_site_low") return { title: "Your services, prices and locations", evidence: `Your website was used in ${a.ownCited} of ${a.total} answers.` };
  if (issue.key.startsWith("theme:")) {
    const t = a.themes.find((x) => `theme:${x.id}` === issue.key);
    return t ? { title: THEME_WORDS[t.id].gap, evidence: `Named in ${t.you} of ${t.answers} ${THEME_WORDS[t.id].noun} answers.` } : null;
  }
  const s = a.sources.find((x) => x.key === sourceKey(issue.key));
  if (!s) return null;
  const titles: Record<string, string> = {
    google: "Your Google listing and ratings",
    delivery: `Your ${s.label} listings`,
    reviews: `What reviewers on ${s.label} say`,
    blogs: `What ${s.label} says about you`,
    social: `Your ${s.label} presence`,
  };
  const used = s.area === "google" ? `Google fed ${s.answers} answers` : `${s.label} was used in ${s.answers} answers`;
  return { title: titles[s.area] ?? `Your ${s.label} listing`, evidence: `${used}, ${namedYou(s.you)}.` };
}

function headline(a: Analysis, gaps: number): string {
  if (a.named === 0) return `AI does not know ${a.name} yet`;
  const t = knownTheme(a);
  if (!t || t.id === "other") return `What AI says about ${a.name} today`;
  const as = THEME_WORDS[t.id].as;
  return gaps >= 2 ? `AI sees ${a.name} as ${as}, and knows little else` : `AI sees ${a.name} as ${as}`;
}

export function knowsSection(a: Analysis, top: Issue[], excerpts: Knows["excerpts"]): Knows {
  const gaps = top.flatMap((issue, i) => {
    const gap = gapFor(a, issue);
    return gap ? [{ ...gap, fix: i + 1 }] : [];
  });
  const shown = gaps.slice(0, MAX_GAPS);
  const trusted = trustedSource(a);
  return {
    headline: headline(a, shown.length),
    knownFor: knownFor(a),
    trustedBy: trusted && { title: trusted.label, detail: `${trusted.label} named you in ${trusted.you} of ${trusted.answers} answers.` },
    foundThrough: foundThrough(a),
    gaps: shown,
    excerpts,
  };
}
