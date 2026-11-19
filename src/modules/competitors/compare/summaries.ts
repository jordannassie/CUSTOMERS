// One-line headlines for Compare's tabs (owner, 2026-11-18: more facts from what is already saved, each in its tab):
// the question tally and question themes for Questions, the sites that favour them for Where AI looked, and how the two
// of you moved over the scans for the trend. Pure.
import { THEME_WORDS, THEMES, themeOf, type ThemeId } from "@/lib/question-themes";
import { tallyResult, type DomainRow, type QuestionTally, type TallyResult } from "@/modules/standing";
import type { PairPoint } from "../charts";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const list = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** "They win 4 questions, you win 1, and 3 are about the same." Null when no question has enough answers. */
export function questionsLine(questions: QuestionTally[]): string | null {
  const counts: Record<TallyResult, number> = { they_win: 0, you_win: 0, tie: 0, too_few: 0 };
  for (const q of questions) counts[tallyResult(q)] += 1;
  if (counts.they_win + counts.you_win + counts.tie === 0) return null;
  const parts = [
    `They win ${plural(counts.they_win, "question", "questions")}`,
    `you win ${counts.you_win}`,
    counts.tie > 0 ? `${counts.tie} ${counts.tie === 1 ? "is" : "are"} about the same` : null,
  ].filter(Boolean);
  return `${parts.slice(0, -1).join(", ")}${parts.length > 2 ? "," : ""} and ${parts.at(-1)}.`;
}

export type ThemeRow = { theme: ThemeId; label: string; questions: number; answers: number; them: number; you: number; result: TallyResult };

/**
 * The questions grouped by what they ask about (the report's themes: price, quality, nearby...), each with both of
 * your answers. Null with fewer than 2 themes: one group would only repeat the totals.
 */
export function themeRows(questions: QuestionTally[]): ThemeRow[] | null {
  const rows = new Map<ThemeId, Omit<ThemeRow, "result" | "label">>();
  for (const q of questions) {
    const theme = themeOf(q.question);
    const row = rows.get(theme) ?? { theme, questions: 0, answers: 0, them: 0, you: 0 };
    row.questions += 1;
    row.answers += q.answers;
    row.them += q.them;
    row.you += q.you;
    rows.set(theme, row);
  }
  const shown = THEMES.flatMap((t) => {
    const r = rows.get(t);
    if (!r || r.answers === 0) return [];
    const label = t === "other" ? "Other questions" : `${THEME_WORDS[t].noun[0].toUpperCase()}${THEME_WORDS[t].noun.slice(1)}`;
    return [{ ...r, label, result: tallyResult(r) }];
  });
  return shown.length < 2 ? null : shown;
}

/** "3 sites named Bean House more than you: yelp.com, tripadvisor.com and maps.google.com." Null when none did. */
export function sitesLine(domains: DomainRow[], name: string): string | null {
  const theirs = domains.filter((d) => d.result === "they_win").map((d) => d.host);
  if (theirs.length === 0) return null;
  const shown = theirs.length > 3 ? [...theirs.slice(0, 3), `${theirs.length - 3} more`] : theirs;
  return `${plural(theirs.length, "site", "sites")} named ${name} more than you: ${list(shown)}.`;
}

/**
 * How each of you moved from the first scan in the chart to the last, on the 30-day score (the scorecard's number):
 * "Since Nov 3, Bean House's 30-day score went from 20% to 38%, and yours stayed at 0%." It says "30-day score" because
 * the chart beside it draws each scan's share, which moves more. Null with fewer than 2 scans with both scores.
 */
export function momentumLine(trend: PairPoint[], name: string): string | null {
  const points = trend
    .map((p) => ({ label: p.label, you: p.youRolling, them: p.themRolling }))
    .filter((p): p is { label: string; you: number; them: number } => p.you !== null && p.them !== null);
  if (points.length < 2) return null;
  const [first, last] = [points[0], points.at(-1)!];
  const moved = (from: number, to: number) => {
    const a = Math.round(from);
    const b = Math.round(to);
    return a === b ? `stayed at ${b}%` : `went from ${a}% to ${b}%`;
  };
  return `Since ${first.label}, ${name}'s 30-day score ${moved(first.them, last.them)}, and yours ${moved(first.you, last.you)}.`;
}
