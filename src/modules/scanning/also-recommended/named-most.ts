// "Who AI named most" in one wording for the first scan screen and the Overview's "Who AI picked instead" (step 6a):
// a tracked competitor by its score, any other name by its share of answers, and always saying which it is, so a
// business you don't track never reads as one you do (BUG-113). Pure.
import type { AlsoRecommendedList } from "./names";

export type NamedMost = {
  name: string;
  /** 0 to 100: a competitor's score, or the share of answers that named another business. */
  rate: number;
  tracked: boolean;
  /** The chain AI named, when a tracked branch's answers named only its chain. */
  chain: string | null;
};

/** "about 7 of 10" from a 0 to 100 rate, worded like the score sentence (D-63). */
export function aboutInTen(rate: number): string {
  const inTen = Math.round(rate / 10);
  return inTen === 0 ? "fewer than 1 of 10" : `about ${inTen} of 10`;
}

/** The business AI named most, tracked or not. Null when AI named no other business. */
export function namedMost(
  competitors: { name: string; score: number; chain?: string | null }[],
  also: AlsoRecommendedList,
): NamedMost | null {
  const candidates: NamedMost[] = [
    ...competitors.map((c) => ({ name: c.name, rate: c.score, tracked: true, chain: c.chain ?? null })),
    ...also.names.map((n) => ({ name: n.name, rate: also.answers > 0 ? (100 * n.answers) / also.answers : 0, tracked: false, chain: null })),
  ].filter((c) => c.rate > 0);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (c.rate > best.rate ? c : best));
}

/** "AI named Burning Brownie most often, in about 4 of 10 answers, a business you don't track." */
export function namedMostSentence(top: NamedMost): string {
  const often = `most often, in ${aboutInTen(top.rate)} answers`;
  if (top.chain) return `AI named ${top.chain} ${often}. You track one of its locations, ${top.name}.`;
  return `AI named ${top.name} ${often}, ${top.tracked ? "one of the competitors you track" : "a business you don't track"}.`;
}
