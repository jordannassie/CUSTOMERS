// Graders for "why competitors win" (MVP_SPEC 7.2, 25). Code checks first (shape, only given facts
// and placeholders, writing guide), then a pass/fail checklist from Claude Haiku, a different model
// from the Sonnet 5 writer. The Haiku grader is trusted only once it agrees with people on at least
// 90% of verdicts (principle 4). Labels come from people, never from a model.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import type { ExplainInput } from "@/modules/insights/facts";
import { explainOutput, MAX_REASONS, MIN_REASONS, type ExplainOutput } from "@/modules/insights/prompts/explain.v1";
import { reasonIssues } from "@/modules/insights/validate";
import type { Judge } from "../shared/judge";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);
export const EXAMPLE_PATH = new URL("./dataset.v1.jsonl.example", import.meta.url);
export const JUDGE_PROMPT_VERSION = "why-competitors-win.judge.v1";
export const MIN_AGREEMENT = 0.9;

export const CHECKLIST = {
  grounded: "Every claim about the business, a competitor or a website comes from the facts. Nothing is guessed about a competitor's website.",
  specific: "Every reason names the specific competitor, question or cited site it is about, not general advice.",
  actionable: "Every reason has steps a business owner could start this week.",
  noInventedNumbers: "Every number appears in the facts, or is a placeholder in braces such as {c1.review_count}.",
} as const;
export type ChecklistItem = keyof typeof CHECKLIST;
export const ITEMS = Object.keys(CHECKLIST) as ChecklistItem[];

const verdicts = z.object({
  grounded: z.boolean(),
  specific: z.boolean(),
  actionable: z.boolean(),
  noInventedNumbers: z.boolean(),
});
export type Verdicts = z.infer<typeof verdicts>;

const caseSchema = z.object({
  id: z.string().min(1),
  // The facts Claude was given: built by buildExplainInput from a real scan, or written by hand.
  input: z.custom<ExplainInput>((v) => typeof v === "object" && v !== null && "business" in v && "placeholders" in v),
  // An explanation the person graded, for checking the Haiku grader against them.
  calibration: z.object({ output: explainOutput, human: verdicts }),
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
  // Only rows in dataset.v1.jsonl.example carry this; the real dataset must not.
  example: z.literal(true).optional(),
});
export type ExplainCase = z.infer<typeof caseSchema>;

export function parseDataset(text: string, opts: { allowExamples: boolean }): ExplainCase[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = caseSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`dataset line ${i + 1}: ${parsed.error.message}`);
      if (parsed.data.example && !opts.allowExamples) {
        throw new Error(`dataset line ${i + 1}: example rows are not labelled data; remove them`);
      }
      return parsed.data;
    });
}

/** Null until a person has labelled dataset.v1.jsonl; the AI suite then skips. */
export function loadDataset(path: URL = DATASET_PATH): ExplainCase[] | null {
  if (!existsSync(path)) return null;
  return parseDataset(readFileSync(path, "utf8"), { allowExamples: false });
}

export type CodeGrade = { pass: boolean; issues: string[] };

export function codeGrade(output: ExplainOutput, input: ExplainInput): CodeGrade {
  const issues: string[] = [];
  const n = output.reasons.length;
  if (n < MIN_REASONS || n > MAX_REASONS) issues.push(`${n} reasons, needs ${MIN_REASONS} to ${MAX_REASONS}`);
  output.reasons.forEach((r, i) => issues.push(...reasonIssues(r, input).map((issue) => `reason ${i + 1}: ${issue}`)));
  return { pass: issues.length === 0, issues };
}

export const JUDGE_SYSTEM = `You check explanations written for a local business owner about why AI assistants recommend their competitors. You get the facts the writer was given and the explanation it wrote.

Answer each check with true (passes) or false (fails). Be strict: one reason that fails a check fails it for the whole explanation. Placeholders in braces such as {c1.review_count} are filled with real Google values later and count as given facts.

Checks:
${ITEMS.map((k) => `- ${k}: ${CHECKLIST[k]}`).join("\n")}`;

export function judgeUserMessage(input: ExplainInput, output: ExplainOutput): string {
  return `<facts>\n${JSON.stringify(input, null, 2)}\n</facts>\n\n<explanation>\n${JSON.stringify(output, null, 2)}\n</explanation>`;
}

export function judgeExplanation(judge: Judge, input: ExplainInput, output: ExplainOutput): Promise<Verdicts> {
  return judge({ system: JUDGE_SYSTEM, user: judgeUserMessage(input, output), schema: verdicts });
}

export const allPass = (v: Verdicts) => ITEMS.every((k) => v[k]);

/** Share of single verdicts where the grader and the person agree, per item and overall. */
export function agreement(pairs: { judge: Verdicts; human: Verdicts }[]) {
  const byItem = Object.fromEntries(
    ITEMS.map((k) => [k, pairs.length ? pairs.filter((p) => p.judge[k] === p.human[k]).length / pairs.length : 0]),
  ) as Record<ChecklistItem, number>;
  const matches = pairs.reduce((sum, p) => sum + ITEMS.filter((k) => p.judge[k] === p.human[k]).length, 0);
  const overall = pairs.length ? matches / (pairs.length * ITEMS.length) : 0;
  return { cases: pairs.length, overall, byItem, trusted: pairs.length > 0 && overall >= MIN_AGREEMENT };
}

export type GradedCase = {
  id: string;
  output: ExplainOutput | null;
  code: CodeGrade | null;
  judge: Verdicts | null;
  pass: boolean;
  /** Set when the writer or the grader call failed outside the model (principle 9); left out of the scores. */
  apiError: string | null;
};

export function score(graded: GradedCase[]) {
  const scored = graded.filter((g) => g.apiError === null);
  return {
    total: graded.length,
    scored: scored.length,
    apiErrors: graded.length - scored.length,
    codePassRate: scored.length ? scored.filter((g) => g.code?.pass).length / scored.length : 0,
    passRate: scored.length ? scored.filter((g) => g.pass).length / scored.length : 0,
  };
}
