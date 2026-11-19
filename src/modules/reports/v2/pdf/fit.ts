import type { ReportFix } from "../snapshot-schema";
import { countLines, type Measure } from "./measure";

// How many lines each text of a fix card may use, so two cards always fit one page (636pt between the header and the
// footer). Line counts come from measuring the text with Inter (measure.ts), or from a character count when the font
// cannot be read; both run high rather than low, so a text is only cut short when the card would not fit otherwise.
// The height that results is an upper bound because every text is also capped at its line limit when drawn.

export const FIX_TYPE = {
  body: { size: 10.5, lineHeight: 1.4 },
  step: { size: 10, lineHeight: 1.35 },
  goal: { size: 10, lineHeight: 1.25 },
} as const;

const LINE = {
  body: FIX_TYPE.body.size * FIX_TYPE.body.lineHeight,
  step: FIX_TYPE.step.size * FIX_TYPE.step.lineHeight,
  goal: FIX_TYPE.goal.size * FIX_TYPE.goal.lineHeight,
};
/** Fallback characters per line, about 10% below what Inter fits in a card (95 body, 105 steps, 75 bold goal). */
const CHARS_PER_LINE = { body: 86, step: 95, goal: 66 };
const MAX_LINES = { evidence: 3, why: 2, step: 2, goal: 2 };

/** Everything in a card except its variable text: padding, title row, meta line, labels, rules and gaps (measured 146). */
const CARD_FIXED = 149;
const STEP_GAP = 3;
/** The room for the cards of one fix page (636pt between header and footer), less each card's 15pt bottom margin. */
const PAGE_ROOM = 636 - 4;
const CARD_MARGIN = 15;

export interface FixLines {
  evidence: number;
  why: number;
  steps: number[];
  goal: number;
}

const estimate = (text: string, perLine: number) => Math.max(1, Math.ceil(text.trim().length / perLine));

/** Text widths inside a card: 516pt less 1pt borders and 17pt padding; steps lose their 13pt number column. */
const WIDTH = { body: 480, step: 467 };

type FitInput = Pick<ReportFix, "evidence" | "why" | "steps" | "goal">;

function lineCounts(fix: FitInput, measure: Measure | null) {
  if (!measure) {
    return {
      evidence: estimate(fix.evidence, CHARS_PER_LINE.body),
      why: estimate(fix.why, CHARS_PER_LINE.body),
      steps: fix.steps.map((step) => estimate(step, CHARS_PER_LINE.step)),
      goal: estimate(fix.goal.text, CHARS_PER_LINE.goal),
    };
  }
  const body = (text: string) => countLines(measure, text, FIX_TYPE.body.size, 400, WIDTH.body);
  const goalWidth = WIDTH.body - measure(fix.goal.label, FIX_TYPE.goal.size, 400) - 16;
  return {
    evidence: body(fix.evidence),
    why: body(fix.why),
    steps: fix.steps.map((step) => countLines(measure, step, FIX_TYPE.step.size, 400, WIDTH.step)),
    goal: countLines(measure, fix.goal.text, FIX_TYPE.goal.size, 600, goalWidth),
  };
}

export function fixHeight(lines: FixLines): number {
  const steps = lines.steps.reduce((sum, n) => sum + n * LINE.step + STEP_GAP, 0);
  return CARD_FIXED + (lines.evidence + lines.why) * LINE.body + steps + lines.goal * LINE.goal;
}

const cutsFor = (lines: FixLines): Array<() => boolean> => [
  // In order: the last two-line step, then evidence to 2 lines, goal to 1, why to 1, evidence to 1.
  () => {
    const i = lines.steps.lastIndexOf(2);
    if (i < 0) return false;
    lines.steps[i] = 1;
    return true;
  },
  () => lines.evidence > 2 && Boolean((lines.evidence = 2)),
  () => lines.goal > 1 && Boolean((lines.goal = 1)),
  () => lines.why > 1 && Boolean((lines.why = 1)),
  () => lines.evidence > 1 && Boolean((lines.evidence = 1)),
];

/** The line limits one card would like, from its text alone. */
function wantedLines(fix: FitInput, measure: Measure | null): FixLines {
  const counts = lineCounts({ ...fix, steps: fix.steps.slice(0, 4) }, measure);
  return {
    evidence: Math.min(MAX_LINES.evidence, counts.evidence),
    why: Math.min(MAX_LINES.why, counts.why),
    steps: counts.steps.map((n) => Math.min(MAX_LINES.step, n)),
    goal: Math.min(MAX_LINES.goal, counts.goal),
  };
}

/**
 * Line limits for the cards of one fix page (one or two cards). While they would not fit, the taller card gives up a
 * line first, least important text first.
 */
export function fitFixPage(fixes: FitInput[], measure: Measure | null = null): FixLines[] {
  const all = fixes.map((fix) => wantedLines(fix, measure));
  const total = () => all.reduce((sum, l) => sum + fixHeight(l) + CARD_MARGIN, 0);
  while (total() > PAGE_ROOM) {
    const byHeight = [...all].sort((a, b) => fixHeight(b) - fixHeight(a));
    if (!byHeight.some((l) => cutsFor(l).some((cut) => cut()))) break;
  }
  return all;
}
