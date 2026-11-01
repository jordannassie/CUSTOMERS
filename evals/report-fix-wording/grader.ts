// Graders for the report's fix wording (fix-wording.v1). Code checks first: the schema, one rewrite for every fix,
// and the same per-fix checks production runs (lengths, steps, only the report's numbers and websites, the writing
// guide, no promised results). Then a pass/fail checklist from a judge of the other model family than the writer
// (principle 5), trusted only once it agrees with people on at least 90% of verdicts (principle 4). Labels come from
// people, never from a model (principle 6).
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { fixWordingOutput, type FixWordingOutput } from "@/modules/reports/prompts/fix-wording.v1";
import { reportSnapshotSchema, type ReportSnapshot } from "@/modules/reports/v2/snapshot-schema";
import { fixWordingIssues, wordingContext } from "@/modules/reports/v2/wording/validate";
import { buildFixWordingInput } from "@/modules/reports/v2/wording/input";
import type { Judge } from "../shared/judge";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);
export const EXAMPLE_PATH = new URL("./dataset.v1.jsonl.example", import.meta.url);
export const JUDGE_PROMPT_VERSION = "report-fix-wording.judge.v1";
export const MIN_AGREEMENT = 0.9;

export type CodeGrade = { pass: boolean; issues: string[] };

/** Grades one writer answer against the snapshot it was written for; `raw` may be anything the model returned. */
export function codeGrade(raw: unknown, snapshot: ReportSnapshot): CodeGrade {
  const parsed = fixWordingOutput.safeParse(raw);
  if (!parsed.success) return { pass: false, issues: [`schema: ${parsed.error.issues.map((i) => i.message).join(", ")}`] };
  const ctx = wordingContext(snapshot);
  const expected = new Set(snapshot.fixes.map((f) => f.key));
  const seen = new Set<string>();
  const issues: string[] = [];
  for (const w of parsed.data.fixes) {
    if (!expected.has(w.key)) issues.push(`unknown fix key: ${w.key}`);
    else if (seen.has(w.key)) issues.push(`duplicate fix key: ${w.key}`);
    else issues.push(...fixWordingIssues(w, ctx).map((issue) => `${w.key}: ${issue}`));
    seen.add(w.key);
  }
  for (const key of expected) if (!seen.has(key)) issues.push(`${key}: no rewrite returned`);
  return { pass: issues.length === 0, issues };
}

export const CHECKLIST = {
  faithful: "Every fix keeps the problem, the place to fix it and the actions of its draft and evidence. Nothing is left out that matters, and no new action is added.",
  grounded: "Every claim about the business, a competitor, an AI assistant or a website comes from that fix's facts. Nothing is guessed.",
  plain: "A local business owner with no marketing background understands every sentence. No jargon, no salesy or AI-sounding words.",
  actionable: "Every step is one concrete action the owner could start this week, and the steps are in a sensible order.",
} as const;
export type ChecklistItem = keyof typeof CHECKLIST;
export const ITEMS = Object.keys(CHECKLIST) as ChecklistItem[];

const verdicts = z.object({ faithful: z.boolean(), grounded: z.boolean(), plain: z.boolean(), actionable: z.boolean() });
export type Verdicts = z.infer<typeof verdicts>;

const caseSchema = z.object({
  id: z.string().min(1),
  /** The frozen report, with its template fixes in `fixes`: what the writer is given and checked against. */
  snapshot: reportSnapshotSchema,
  /** One rewrite a person graded, for checking the judge against them. */
  calibration: z.object({ output: fixWordingOutput, human: verdicts }),
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
  // Only rows in dataset.v1.jsonl.example carry this; the real dataset must not.
  example: z.literal(true).optional(),
});
export type WordingCase = z.infer<typeof caseSchema>;

export function parseDataset(text: string, opts: { allowExamples: boolean }): WordingCase[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = caseSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`dataset line ${i + 1}: ${parsed.error.message}`);
      if (parsed.data.example && !opts.allowExamples) throw new Error(`dataset line ${i + 1}: example rows are not labelled data; remove them`);
      return parsed.data;
    });
}

/** Null until a person has labelled dataset.v1.jsonl; the AI suite then skips. */
export function loadDataset(path: URL = DATASET_PATH): WordingCase[] | null {
  if (!existsSync(path)) return null;
  return parseDataset(readFileSync(path, "utf8"), { allowExamples: false });
}

export const JUDGE_SYSTEM = `You check fix descriptions written for a local business owner in a report about how often AI assistants recommend their business. You get the facts and draft for each fix, and the rewrite to check.

Answer each check with true (passes) or false (fails). Be strict: one fix that fails a check fails it for the whole rewrite.

Checks:
${ITEMS.map((k) => `- ${k}: ${CHECKLIST[k]}`).join("\n")}`;

export function judgeUserMessage(snapshot: ReportSnapshot, output: FixWordingOutput): string {
  const facts = buildFixWordingInput(snapshot.fixes, snapshot);
  return `<facts>\n${JSON.stringify(facts, null, 2)}\n</facts>\n\n<rewrite>\n${JSON.stringify(output, null, 2)}\n</rewrite>`;
}

export function judgeWording(judge: Judge, snapshot: ReportSnapshot, output: FixWordingOutput): Promise<Verdicts> {
  return judge({ system: JUDGE_SYSTEM, user: judgeUserMessage(snapshot, output), schema: verdicts });
}

export const allPass = (v: Verdicts) => ITEMS.every((k) => v[k]);

/** Share of single verdicts where the judge and the person agree, per item and overall. */
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
  output: FixWordingOutput | null;
  code: CodeGrade | null;
  judge: Verdicts | null;
  pass: boolean;
  /** Set when the writer or the judge call failed outside the model (principle 9); left out of the scores. */
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
