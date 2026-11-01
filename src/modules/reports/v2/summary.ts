// Page 2: the headline ("AI named Cheezious in 9 of 60 answers. Pizza Hut was named in 23."), the 2 to 3 sentence
// lead and the short version (what AI knows, why you are behind, what fixes it). Pure.
import type { Analysis } from "./analysis";
import type { Issue } from "./issues";
import { foundSources, knownTheme } from "./knows";
import { AREA_LABELS, type ReportSnapshot } from "./snapshot-schema";
import { inSentence, list } from "./text";
import { THEME_WORDS } from "./themes";

type Summary = ReportSnapshot["summary"];
type Reason = ReportSnapshot["behind"]["reasons"][number];

/** The competitor AI named most; ties by name, so it never changes between builds. */
function mostNamed(a: Analysis) {
  return [...a.rivals].sort((x, y) => y.mentions - x.mentions || x.name.localeCompare(y.name))[0] ?? null;
}

export function headline(a: Analysis): string {
  const first = `AI named ${a.name} in ${a.named} of ${a.total} answers.`;
  const top = mostNamed(a);
  if (!top) return first;
  if (top.mentions > a.named) return `${first} ${top.name} was named in ${top.mentions}.`;
  if (top.mentions === a.named && top.mentions > 0) return `${first} ${top.name} was named in ${top.mentions} too.`;
  return `${first} That is more than any business you track.`;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export function lead(a: Analysis, top: Issue[], score: number): string {
  const where = a.market ? ` in ${a.market}` : "";
  const first = `When people${where} asked AI the ${a.questions} questions we track, ${a.name} came up in ${score}% of answers.`;
  const known = knownTheme(a);
  const knownAs = known && known.id !== "other" ? THEME_WORDS[known.id].as : null;
  const weak = top.flatMap((i) => {
    const id = i.key.startsWith("theme:") ? (i.key.slice(6) as keyof typeof THEME_WORDS) : null;
    return id && id !== known?.id ? [lowerFirst(THEME_WORDS[id].gap)] : [];
  });
  const second =
    knownAs && weak.length > 0
      ? `AI knows you as ${knownAs}, but it has little to say about ${list(weak)}.`
      : knownAs
        ? `AI knows you best as ${knownAs}.`
        : weak.length > 0
          ? `AI has little to say about ${list(weak)}.`
          : "";
  const third = !a.domain
    ? "You have no website saved for AI to read."
    : a.ownCited === 0
      ? "It never used your own website as a source."
      : `It used your website in ${a.ownCited} of ${a.total} answers.`;
  return [first, second, third].filter(Boolean).join(" ");
}

function whereWords(top: Issue[]): string[] {
  // A one-place fix names its site ("Foodpanda"); a fix made in several places names where it starts.
  const words = top.slice(0, 2).map((i) => inSentence(i.areas.length === 1 ? i.where : AREA_LABELS[i.areas[0]]));
  return [...new Set(words)];
}

export function shortVersion(a: Analysis, top: Issue[], reasons: Reason[]): Summary["short"] {
  const known = knownTheme(a);
  const sites = foundSources(a, 3).filter((s) => s.area !== "website").map((s) => s.label);
  const knows = [
    known ? `AI names you most for ${known.id === "other" ? "general" : THEME_WORDS[known.id].noun} questions.` : "AI did not name you in any answer yet.",
    sites.length > 0 ? `Most of what AI knows about you comes from ${list(sites)}.` : "",
  ];
  const names = a.ahead.slice(0, 2).map((r) => r.name);
  // The first reason that is about them by name, so the line says why they win.
  const reason = reasons.find((r) => names.some((n) => r.them.includes(n))) ?? reasons[0];
  const behind =
    names.length === 0
      ? "No business you track is named more often than you."
      : `${list(names)} ${names.length === 1 ? "is" : "are"} named more often.${reason ? ` ${reason.them}` : ""}`;
  const where = whereWords(top);
  const fixes =
    top.length === 0
      ? "No urgent fixes. Keep your website and listings up to date."
      : `Start where AI reads: ${list(where)}.${top[2] ? ` Then ${lowerFirst(top[2].title)}.` : ""}`;
  return { knows: knows.filter(Boolean).join(" "), behind, fixes };
}

export function summarySection(a: Analysis, top: Issue[], reasons: Reason[], score: number): Summary {
  return { headline: headline(a), lead: lead(a, top, score), short: shortVersion(a, top, reasons) };
}
