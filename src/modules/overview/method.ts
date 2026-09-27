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
  margin: number;
  checks: number;
  uniqueAnswers: number;
  models: { id: ProviderId; label: string; score: number | null; margin: number | null }[];
};

export type MethodPanel = {
  title: string;
  intro: string;
  numbers: { label: string; value: string; hint?: string }[];
  models: { id: ProviderId; label: string; value: string }[];
  modelsNote: string;
  sections: { heading: string; paragraphs: string[] }[];
  calibration: { heading: string; paragraphs: string[]; agreement: { label: string; value: string }[] } | null;
};

const count = (n: number) => n.toLocaleString("en-US");
const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

/** "ChatGPT, Claude and Perplexity". */
export function listNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function methodPanel(input: MethodInput, calibration: Calibration | null): MethodPanel {
  const aiNames = listNames(input.models.map((m) => m.label));
  return {
    title: "How your score is calculated",
    intro: `Your score is how often AI recommended you when we asked the questions your customers ask, over the last ${input.windowDays} days.`,
    numbers: [
      { label: "Time covered", value: `Last ${input.windowDays} days` },
      { label: "Answers checked", value: count(input.checks) },
      {
        label: "Different answers",
        value: count(input.uniqueAnswers),
        hint: "An answer we reused for more than one business counts once here.",
      },
      { label: "Margin of error", value: `Plus or minus ${points(input.margin)}` },
      { label: "Confidence", value: input.label },
    ],
    models: input.models.map((m) => ({
      id: m.id,
      label: m.label,
      value: m.score === null ? "No checks yet" : `${m.score}, plus or minus ${points(m.margin ?? 0)}`,
    })),
    modelsNote: "Your overall score is the average of these, each counted equally.",
    sections: [
      {
        heading: "How we check",
        paragraphs: [
          `We ask ${aiNames} the questions on your Questions page, the same way a customer would.`,
          "Each AI searches the web for its answer, and we tell it your city so it answers like it would for someone near you.",
          "We count an answer when it names your business. Where you appear in a list does not change your score.",
          "We use each AI's direct connection for software (its API), not the chat apps. Answers in the apps can be a little different.",
        ],
      },
      {
        heading: "Why there is a margin of error",
        paragraphs: [
          "AI gives slightly different answers each time it is asked, so every score is an estimate. The more different answers we have, the smaller the margin.",
          "We only show an arrow up or down, or say a competitor is ahead of you, when the change is bigger than the margin.",
          "Early estimate means fewer than 50 different answers. Good confidence means 50 to 200. High confidence means more than 200.",
        ],
      },
    ],
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
