// Fit of the questions written for "Other" businesses (2026-10-16). Each case is a business whose kind is not one of
// our industries; the paid suite writes its 12 questions with the real flow (prepareQuestions, with the fit check in
// prompts/question-fit.v1.ts) and grades every question: code checks first, then a judge from the other model family
// answers pass or fail. Pure, so the free suite tests the dataset and the scoring.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { isVagueOtherLabel } from "@/lib/other-label";
import { cityLabel, isFairQuestion } from "@/modules/onboarding/question-rules";
import type { QuestionBusiness } from "@/modules/onboarding/questions";
import type { Judge } from "../shared/judge";

export const OTHER_FIT_PATH = new URL("./other-fit.v1.jsonl", import.meta.url);
/** Share of written questions a customer of the business would really ask: the target for the paid run. */
export const RELEVANT_TARGET = 0.9;
export const OTHER_FIT_JUDGE_VERSION = "other-fit-judge.v1";

const otherFitCase = z.object({
  id: z.string().regex(/^of-\d{3}-[a-z0-9-]+$/),
  input: z.object({
    name: z.string().min(1),
    /** The "Other" label the user typed: what kind of business it is. */
    label: z.string().min(1).max(80),
    services: z.array(z.string().min(1)).min(1).max(20),
    city: z.string().min(1),
    region: z.string().min(1).nullable(),
  }),
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
});
export type OtherFitCase = z.infer<typeof otherFitCase>;

export function parseOtherFit(text: string): OtherFitCase[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = otherFitCase.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`other-fit.v1.jsonl line ${i + 1}: ${parsed.error.message}`);
      return parsed.data;
    });
}

export function loadOtherFit(path: URL = OTHER_FIT_PATH): OtherFitCase[] | null {
  return existsSync(path) ? parseOtherFit(readFileSync(path, "utf8")) : null;
}

/** True while the labels are an agent's draft, not yet checked by a person (principle 6). */
export const isDraft = (c: OtherFitCase) => /draft/i.test(c.labelledBy);

/** Problems with the dataset as a whole: repeated ids, a vague label, or a label that is one of our industries. */
export function datasetProblems(cases: OtherFitCase[], ourIndustries: readonly string[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.id)) problems.push(`${c.id}: repeated id`);
    ids.add(c.id);
    if (isVagueOtherLabel(c.input.label)) problems.push(`${c.id}: label "${c.input.label}" is too vague`);
    if (ourIndustries.includes(c.input.label.trim().toLowerCase().replace(/\s+/g, "_"))) problems.push(`${c.id}: "${c.input.label}" is one of our industries`);
  }
  return problems;
}

/** What onboarding holds for the business after the details step: the label is saved as its industry. */
export function questionBusiness(c: OtherFitCase): QuestionBusiness {
  const { name, label, services, city, region } = c.input;
  return { industry: label, industryText: label, services, description: "", city, region, name };
}

/** Code checks before any judge: a fair question that names the city and never the business itself. */
export function codeProblem(question: string, c: OtherFitCase): string | null {
  if (question.toLowerCase().includes(c.input.name.toLowerCase())) return "names the business itself";
  if (!isFairQuestion(question)) return "not a fair question (advice, a choice, not a full question, time-bound, near me, a placeholder or a brand)";
  if (!question.toLowerCase().includes(c.input.city.toLowerCase())) return "does not name the city";
  return null;
}

export const JUDGE_SYSTEM = `You grade questions written to check which local businesses ChatGPT, Claude and Perplexity recommend. You get one business: its kind, its services and its city, and a numbered list of questions.

For each question, answer pass or fail: would a customer asking this question be recommended a business of this kind that offers these services in this city?

Pass when the question asks for this kind of business or for something it sells or does.
Fail when it is really looking for a different kind of business, asks about something this business does not offer, or would be answered with advice, products or brands instead of a local business.

Return one answer for every number.`;

export function judgeUser(c: OtherFitCase, questions: string[]): string {
  const where = cityLabel(c.input.city, c.input.region);
  return `Kind of business: ${c.input.label}\nServices: ${c.input.services.join("; ")}\nCity: ${where}\n\nQuestions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
}

export const judgeOutput = z.object({ answers: z.array(z.object({ number: z.number().int(), verdict: z.enum(["pass", "fail"]) })) });

export type GradedQuestion = { text: string; pass: boolean; by: "code" | "judge"; reason: string | null };
export type OtherFitGraded = {
  id: string;
  label: string;
  questions: GradedQuestion[] | null;
  /** From the fit check inside the flow: how many it replaced, for comparing with EVAL_NO_FIT=1. */
  fit: { rounds: number; rejected: number; replaced: number } | null;
  source: string | null;
  apiError: string | null;
};

/** Code checks first; only questions that pass them go to the judge, all in one call. A missing answer fails. */
export async function gradeQuestions(judge: Judge, c: OtherFitCase, questions: string[]): Promise<GradedQuestion[]> {
  const code = questions.map((text) => ({ text, problem: codeProblem(text, c) }));
  const toJudge = code.filter((q) => !q.problem).map((q) => q.text);
  const verdicts = new Map<string, boolean>();
  if (toJudge.length) {
    const out = await judge({ system: JUDGE_SYSTEM, user: judgeUser(c, toJudge), schema: judgeOutput });
    const byNumber = new Map(out.answers.map((a) => [a.number, a.verdict === "pass"]));
    toJudge.forEach((text, i) => verdicts.set(text, byNumber.get(i + 1) ?? false));
  }
  return code.map((q) =>
    q.problem
      ? { text: q.text, pass: false, by: "code", reason: q.problem }
      : { text: q.text, pass: verdicts.get(q.text) ?? false, by: "judge", reason: verdicts.get(q.text) ? null : "judge: fail" },
  );
}

/** Percent relevant over every graded question; API errors are counted apart and left out (principle 9). */
export function relevance(graded: OtherFitGraded[]) {
  const scored = graded.filter((g) => g.questions !== null);
  const questions = scored.flatMap((g) => g.questions ?? []);
  const relevant = questions.filter((q) => q.pass).length;
  const share = questions.length ? relevant / questions.length : 0;
  return {
    cases: graded.length,
    scored: scored.length,
    apiErrors: graded.length - scored.length,
    questions: questions.length,
    relevant,
    share: Math.round(share * 1000) / 1000,
    failedByCode: questions.filter((q) => !q.pass && q.by === "code").length,
    target: RELEVANT_TARGET,
    passed: scored.length > 0 && share >= RELEVANT_TARGET,
  };
}
