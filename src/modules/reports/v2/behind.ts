// "Why you are behind": who AI names more, up to 4 reasons with their numbers and the fixes that close them, and
// where you already win. Ahead or behind is the leaderboard's call (analysis.ahead); this only explains it. Pure.
import { listings, type Analysis, type SourceStat, type ThemeStat } from "./analysis";
import type { Issue } from "./issues";
import type { ReportSnapshot } from "./snapshot-schema";
import { list, plural, slug, upperFirst } from "./text";
import { THEME_WORDS } from "./themes";

type Behind = ReportSnapshot["behind"];
type Reason = Behind["reasons"][number];

const MAX_REASONS = 4;
const MIN_WIN_ANSWERS = 4;

/** The competitor a reason is about: the one named most in this group, when it beat you there. */
function rivalIn(group: { you: number; rivals: Record<string, number> }, prefer: string | null): { name: string; count: number } | null {
  const best = Object.entries(group.rivals)
    .filter(([, n]) => n > group.you)
    .sort((x, y) => (x[0] === prefer ? -1 : y[0] === prefer ? 1 : 0) || y[1] - x[1] || x[0].localeCompare(y[0]))[0];
  return best ? { name: best[0], count: best[1] } : null;
}

function sourceReason(s: SourceStat, rival: { name: string; count: number }, fix: number): Reason {
  const google = s.area === "google";
  const titles: Record<string, string> = {
    google: "Google sends answers their way",
    reviews: `${s.label} quotes them more`,
    blogs: `${s.label} features them more`,
    social: `They show up on ${s.label}`,
  };
  return {
    title: titles[s.area] ?? `${s.label} lists them more`,
    them: google ? `Google fed ${rival.count} answers that named ${rival.name}.` : `${s.label} was used in ${rival.count} answers that named ${rival.name}.`,
    you: google
      ? `Google fed ${s.answers} answers and named you in ${s.you === 0 ? "none" : s.you}.`
      : `${s.label} named you in ${s.you} of ${s.answers} answers.`,
    fixes: [fix],
  };
}

function themeReason(themes: { t: ThemeStat; fix: number }[], prefer: string | null): Reason | null {
  const rival = prefer ?? rivalIn(themes[0].t, null)?.name ?? null;
  if (!rival) return null;
  const nouns = themes.map(({ t }) => THEME_WORDS[t.id].noun);
  const of = (n: number, t: ThemeStat) => `${n} of ${t.answers} ${THEME_WORDS[t.id].noun} answers`;
  return {
    title: `They are linked with ${list(nouns)} questions`,
    them: `${rival} was named in ${list(themes.map(({ t }) => of(t.rivals[rival] ?? 0, t)))}.`,
    you: `You were named in ${list(themes.map(({ t }) => of(t.you, t)))}.`,
    fixes: themes.map(({ fix }) => fix),
  };
}

export function behindReasons(a: Analysis, top: Issue[]): Reason[] {
  const prefer = a.ahead[0]?.name ?? null;
  const reasons: { at: number; reason: Reason }[] = [];
  const themes: { t: ThemeStat; fix: number }[] = [];
  top.forEach((issue, i) => {
    const fix = i + 1;
    if (issue.key.startsWith("theme:")) {
      const t = a.themes.find((x) => `theme:${x.id}` === issue.key);
      if (t) themes.push({ t, fix });
      return;
    }
    if (issue.key.startsWith("own_site") || issue.key === "no_site") {
      if (a.otherSites === 0) return;
      const you = a.domain ? `Your website was used in ${plural(a.ownCited, "answer")}.` : "You have no website saved, so AI has none of your pages to use.";
      reasons.push({ at: fix, reason: { title: "Their facts are easy to read online", them: `Other business websites were used in ${a.otherSites} answers.`, you, fixes: [fix] } });
      return;
    }
    const s = a.sources.find((x) => x.key === issue.key.split(":").at(-1));
    const rival = s && rivalIn(s, issue.key.startsWith("rival:") ? (a.ahead.find((r) => issue.key.startsWith(`rival:${slug(r.name)}:`))?.name ?? prefer) : prefer);
    if (s && rival) reasons.push({ at: fix, reason: sourceReason(s, rival, fix) });
  });
  if (themes.length > 0) {
    const reason = themeReason(themes, prefer && themes.some(({ t }) => (t.rivals[prefer] ?? 0) > t.you) ? prefer : null);
    if (reason) reasons.push({ at: themes[0].fix, reason });
  }
  return reasons.sort((x, y) => x.at - y.at).slice(0, MAX_REASONS).map((r) => r.reason);
}

/** Themes where AI names you at least as often as any competitor, and the listing that names you most. */
export function winsLine(a: Analysis): string | null {
  const themes = a.themes.filter((t) => t.id !== "other" && t.answers >= MIN_WIN_ANSWERS && t.you >= 2 && Object.values(t.rivals).every((n) => n <= t.you));
  const site = listings(a)
    .filter((s) => s.answers >= 3 && s.you / s.answers >= 0.5)
    .sort((x, y) => y.you / y.answers - x.you / x.answers || y.you - x.you)[0];
  const nouns = themes.map((t) => THEME_WORDS[t.id].noun);
  const siteLine = site ? `${site.label} named you in ${site.you} of the ${site.answers} answers that used it.` : "";
  if (nouns.length > 0 && site) return `${upperFirst(list(nouns))} questions, and ${site.label}. ${siteLine} Keep both strong while you fix the gaps.`;
  if (nouns.length > 0) return `AI names you at least as often as anyone for ${list(nouns)} questions. Keep that strong while you fix the gaps.`;
  return site ? `${siteLine} Keep it strong while you fix the gaps.` : null;
}

function standingLine(a: Analysis, reasons: number): string {
  const rows = [{ name: a.name, mentions: a.named }, ...a.rivals.map((r) => ({ name: r.name, mentions: r.mentions }))]
    .filter((r) => r.mentions > 0)
    .sort((x, y) => y.mentions - x.mentions || x.name.localeCompare(y.name));
  const named = rows.map((r, i) => (i === 0 ? `${r.name} was named in ${r.mentions} of ${a.total} answers` : `${r.name} in ${r.mentions}`));
  const zero = a.rivals.filter((r) => r.mentions === 0).map((r) => r.name);
  const parts = [
    named.length > 0 ? `${list(named)}.` : `No business you track was named in any of the ${a.total} answers.`,
    zero.length > 0 && named.length > 0 ? `${list(zero)} ${zero.length === 1 ? "was" : "were"} not named in any answer.` : "",
    a.ahead.length > 0 && reasons > 0 ? `${reasons === 1 ? "1 reason explains" : `${reasons} reasons explain`} most of the gap.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function behindSection(a: Analysis, top: Issue[]): Behind {
  const reasons = a.ahead.length > 0 ? behindReasons(a, top) : [];
  const names = a.ahead.slice(0, 2).map((r) => r.name);
  const headline =
    names.length === 0
      ? "No business you track is named more often than you"
      : `${list(names)} ${names.length === 1 ? "gives" : "give"} AI more to work with`;
  return { headline, line: standingLine(a, reasons.length), reasons, wins: winsLine(a) };
}
