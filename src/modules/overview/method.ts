import type { ProviderId } from "@/modules/scanning";

// The "How is this calculated?" panel (B-57, MVP_SPEC 5.6, D-64, D-66). Pure, so the wording is snapshot tested.

/** Agreement with the real ChatGPT, Claude and Perplexity apps, measured by a person (B-76, D-66). */
export type Calibration = {
  /** ISO date the check was done. */
  checkedOn: string;
  /** Percent of questions where our check and the app named the same businesses. */
  agreement: Partial<Record<ProviderId, number>>;
};

// Stays null until B-76 records a real result; the panel then shows nothing about it.
export const CALIBRATION: Calibration | null = null;

export type MethodInput = {
  windowDays: number;
  label: string;
  /** The confidence level behind `label` (D-64): under 50 different answers early, 50 to 200 good, over 200 high. */
  confidence: "early" | "good" | "high";
  margin: number;
  checks: number;
  uniqueAnswers: number;
  models: { id: ProviderId; label: string; score: number | null; margin: number | null; notChecked?: boolean; skipped?: boolean }[];
};

export type MethodStep = { icon: "ask" | "search" | "count" | "questions"; title: string; detail: string };

export type MethodPanel = {
  title: string;
  intro: string;
  /** Per AI: the score, or why there is none. */
  models: { id: ProviderId; label: string; score: number | null; value: string }[];
  modelsNote: string;
  numbers: { label: string; value: string; hint?: string }[];
  steps: MethodStep[];
  /** How sure the score is (D-64), said as how it improves rather than as a warning. */
  accuracy: { level: MethodInput["confidence"]; label: string; margin: string; note: string };
  calibration: { heading: string; paragraphs: string[]; agreement: { label: string; value: string }[] } | null;
};

const count = (n: number) => n.toLocaleString("en-US");
const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;
// The confidence bands (D-64): different answers needed for each level.
const GOOD_FROM = 50;
const HIGH_FROM = 201;

/** "ChatGPT, Claude and Perplexity". */
export function listNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function accuracyNote(confidence: MethodInput["confidence"], unique: number): string {
  if (confidence === "high") return `Based on ${count(unique)} different answers.`;
  const next = confidence === "early" ? { at: GOOD_FROM, label: "good" } : { at: HIGH_FROM, label: "high" };
  const more = Math.max(1, next.at - unique);
  return `Gets sharper with every scan: ${count(more)} more different ${more === 1 ? "answer" : "answers"} for ${next.label} confidence.`;
}

export function methodPanel(input: MethodInput, calibration: Calibration | null): MethodPanel {
  const aiNames = listNames(input.models.map((m) => m.label));
  return {
    title: "How your score is calculated",
    intro: `How often AI recommended you over the last ${input.windowDays} days.`,
    models: input.models.map((m) => ({
      id: m.id,
      label: m.label,
      score: m.score,
      value: m.score !== null ? String(m.score) : m.skipped ? "Skipped" : m.notChecked ? "Not checked" : "No checks yet",
    })),
    modelsNote: "Your score is the average of these.",
    numbers: [
      { label: "Time covered", value: `Last ${input.windowDays} days` },
      { label: "Answers checked", value: count(input.checks), hint: "Answers to suggested questions only." },
      { label: "Different answers", value: count(input.uniqueAnswers) },
    ],
    steps: [
      { icon: "ask", title: "We ask your customer questions", detail: `${aiNames}, the same way a customer would.` },
      { icon: "search", title: "Each AI searches the web from your city", detail: "So it answers like it would for someone near you." },
      { icon: "count", title: "We count every answer that names you", detail: "Where you appear in a list doesn't change your score." },
      // BUG-129: questions the user writes could raise the score at will, so only suggested ones count.
      { icon: "questions", title: "Suggested questions only", detail: "Questions you add yourself are tracked on their own." },
    ],
    accuracy: {
      level: input.confidence,
      label: input.label,
      margin: `Give or take ${points(input.margin)}`,
      note: accuracyNote(input.confidence, input.uniqueAnswers),
    },
    calibration: calibration && calibrationSection(calibration, input.models),
  };
}

function calibrationSection(calibration: Calibration, models: MethodInput["models"]): MethodPanel["calibration"] {
  const date = new Date(`${calibration.checkedOn}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    heading: "Tested against the real apps",
    paragraphs: [
      `In ${date}, a person asked the real ChatGPT, Claude and Perplexity apps the same questions and compared the businesses they named with ours.`,
    ],
    agreement: models.flatMap((m) => {
      const percent = calibration.agreement[m.id];
      return percent === undefined ? [] : [{ label: m.label, value: `Matched in ${Math.round(percent)}% of questions` }];
    }),
  };
}
