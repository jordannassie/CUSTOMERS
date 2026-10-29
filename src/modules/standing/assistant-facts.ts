// "ChatGPT names them more" (dashboard redesign brief, rule 2): an AI tool whose share of answers naming them beats
// yours by more than the margin, with the site that tool used most in those answers, so the fix has a place. Pure.
import { compareStatus } from "@/modules/scanning";
import { sourceType } from "@/lib/site-type";
import { namedIn, type StandingCheck } from "./checks";
import type { Fact, Where } from "./reasons";

const MIN_ANSWERS = 4;
const Z = 1.96;
const pct = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

/** The margin on your share for this many answers, smoothed so 0 of 5 still has one (like the score's, D-64). */
export function shareMargin(hits: number, answers: number): number {
  const p = (hits + 1) / (answers + 2);
  return Z * 100 * Math.sqrt((p * (1 - p)) / Math.max(1, answers));
}

/** Below this many answers a question or site shows "Too few answers" instead of who wins. */
export const MIN_TALLY_ANSWERS = 2;
export type TallyResult = "they_win" | "you_win" | "tie" | "too_few";

/**
 * Who wins a question or a site: only a gap bigger than the margin on your share counts, so 1 of 1 against 0 of 1
 * is never a win (audit, 2026-10-28). Same margin as the per-AI facts.
 */
export function tallyResult(t: { answers: number; them: number; you: number }): TallyResult {
  if (t.answers < MIN_TALLY_ANSWERS) return "too_few";
  const status = compareStatus(pct(t.you, t.answers), pct(t.them, t.answers), shareMargin(t.you, t.answers));
  return status === "behind" ? "they_win" : status === "ahead" ? "you_win" : "tie";
}

const WHERE_FOR: Record<string, Where> = { reviews: "other_places", directories: "other_places", news: "other_places", social: "other_places" };

export function assistantFacts(
  checks: StandingCheck[],
  tracked: string,
  name: string,
  assistants: { provider: string; assistant: string; answers: number; them: number; you: number }[],
  theirSite: string | null,
): Fact[] {
  return assistants.flatMap((a) => {
    if (a.answers < MIN_ANSWERS) return [];
    const them = pct(a.them, a.answers);
    const you = pct(a.you, a.answers);
    if (compareStatus(you, them, shareMargin(a.you, a.answers)) !== "behind") return [];
    const lost = checks.filter((c) => c.provider === a.provider && namedIn(c, tracked) && !c.youNamed);
    const used = new Map<string, number>();
    for (const c of lost) for (const host of new Set(c.sites)) used.set(host, (used.get(host) ?? 0) + 1);
    const [top, n] = [...used].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0] ?? [null, 0];
    const google = !!top && /(^|\.)google\./.test(top);
    const own = !!top && !!theirSite && (top === theirSite || top.endsWith(`.${theirSite}`));
    const where: Where = google ? "google_listing" : own || !top ? "website" : (WHERE_FOR[sourceType(top, null)] ?? "other_places");
    const action = !top
      ? `${a.assistant} cited no sites in those answers, so we can't see where it looked. Your website and Google listing are the best places to start.`
      : google
        ? `${a.assistant} used Google in ${n} of those answers. Complete your Google listing: hours, category, photos and reviews.`
        : own
          ? `${a.assistant} read their own website in ${n} of those answers. Give each of your services a clear page it can read.`
          : `${a.assistant} used ${top} in ${n} of those answers. Get listed there, or improve your page on it.`;
    return [
      {
        title: `${a.assistant} names them more`,
        detail: `${them}% of its answers named them, ${you}% named you.`,
        text: `${a.assistant} named ${name} in ${a.them} of ${a.answers} answers (${them}%) and you in ${a.you} (${you}%).`,
        where,
        weight: (them - you) / 12,
        action,
        match: top ? [top, top.split(".")[0]] : undefined,
        // Pointing at a site: the same fix as that site's own reason, so the two share one key and one action.
        key: google ? "google:listing" : top && !own ? `site:${top}` : `ai:${a.provider}`,
        assistant: a.assistant,
        provider: a.provider,
        answers: a.answers,
        basis: "answers" as const,
      },
    ];
  });
}
