import { namedAs } from "./chain";
import type { CompetitorsView, LeaderRow } from "./service";

// "Who AI picked instead" on the Overview (DB-004): the top three and you. Never a rank (D-63), and a gap inside the
// margin is never called a lead (D-64), nor "about as often" when the numbers are far apart (BUG-111).

// Scores closer than this read as "about as often"; further apart both are named, with why no one leads yet.
const LEVEL_POINTS = 10;

export type PickedInstead = {
  rows: LeaderRow[];
  /** Your margin of error, for the leaderboard's shaded band. */
  margin: number | null;
  /** "Bean House was named in about 7 of 10 answers, you in about 5." */
  sentence: string | null;
  /** True when AI did not name you at all: the screen then points to the first fix instead. */
  notNamed: boolean;
};

const inTen = (score: number) => {
  const n = Math.round(score / 10);
  return n === 0 ? "fewer than 1 of 10" : `about ${n} of 10`;
};

function levelSentence(name: string, theirs: number, yours: number): string {
  if (Math.abs(Math.round(theirs) - Math.round(yours)) < LEVEL_POINTS) {
    return `${name} was named about as often as you, in ${inTen(yours)} answers.`;
  }
  const [first, second] = theirs > yours ? [`${name} was`, "you"] : ["You were", name];
  const low = inTen(Math.min(theirs, yours)).replace(" of 10", "");
  return `${first} named in ${inTen(Math.max(theirs, yours))} answers, ${second} in ${low}. There aren't enough answers yet to say that gap will hold.`;
}

/** Null when there is no score yet or no competitor has been compared with you. */
export function pickedInstead(view: Pick<CompetitorsView, "leaderboard" | "hasScore" | "margin">): PickedInstead | null {
  if (!view.hasScore) return null;
  // Only competitors compared over the whole window (F-53); the leaderboard already sorts them around you.
  const ranked = view.leaderboard.filter((r) => r.isYou || (r.score !== null && r.standing !== null));
  const at = ranked.findIndex((r) => r.isYou);
  const you = ranked[at];
  const top = ranked.find((r) => !r.isYou);
  if (!top || you.score === null) return null;
  // A branch whose score is its chain's is named as the chain AI named (chain.ts).
  const topName = namedAs(top);

  // The top three as named, plus you below them when you're further down. Before, "leader, you, next" skipped
  // the business named second whenever you were third (BUG-112).
  const rows = at < 3 ? ranked.slice(0, 3) : [...ranked.slice(0, 3), you];
  const notNamed = you.score === 0;
  // One still collecting could be ahead, so the claim is kept to the ones compared.
  const collecting = view.leaderboard.some((r) => r.collecting);
  const sentence = notNamed
    ? top.score! > 0
      ? `AI did not name you yet. It named ${topName} in ${inTen(top.score!)} answers.`
      : "AI did not name you or any business you track yet."
    : top.standing === "behind"
      ? `${topName} was named in ${inTen(top.score!)} answers, you in ${inTen(you.score).replace(" of 10", "")}.`
      : top.standing === "about_same"
        ? levelSentence(topName, top.score!, you.score)
        : `You were named more often than ${collecting ? "the competitors compared so far" : "your competitors"}, in ${inTen(you.score)} answers.`;
  return { rows, margin: view.margin, sentence, notNamed };
}
