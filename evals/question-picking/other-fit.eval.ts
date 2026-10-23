// Free checks for the "Other" fit suite (no provider call): the dataset's shape, that every label is specific
// enough to write questions from, the code grader, and the scoring with a fake judge.
import { describe, expect, it } from "vitest";
import { INDUSTRIES } from "@/lib/industries";
import { prepareQuestions } from "@/modules/onboarding/questions";
import type { QuestionModel } from "@/modules/onboarding/question-model";
import type { Judge } from "../shared/judge";
import { codeProblem, datasetProblems, gradeQuestions, isDraft, loadOtherFit, questionBusiness, relevance, type OtherFitCase, type OtherFitGraded } from "./other-fit";

const cases = loadOtherFit();
const FLORIST: OtherFitCase = {
  id: "of-900-fixture",
  input: { name: "Petal and Stem", label: "Florist", services: ["wedding flowers"], city: "Orange", region: "CA" },
  labelledBy: "fixture",
  labelledAt: "2026-10-16",
};

/** A judge that fails anything about a gym and records what it was asked. */
function fakeJudge(asked: string[][]): Judge {
  return (async (req: { user: string }) => {
    const lines = req.user.split("\n").filter((l) => /^\d+\. /.test(l));
    asked.push(lines);
    // Leaves the last number out, which must count as a fail.
    return { answers: lines.slice(0, -1).map((l, i) => ({ number: i + 1, verdict: /gym/i.test(l) ? "fail" : "pass" })) };
  }) as Judge;
}

describe("other-fit.v1.jsonl", () => {
  it("has about 15 businesses, each with a specific label that is not one of our industries", () => {
    expect(cases).not.toBeNull();
    expect(cases!.length).toBeGreaterThanOrEqual(15);
    expect(datasetProblems(cases!, INDUSTRIES)).toEqual([]);
  });

  it("is marked as a draft until a person checks it", () => {
    expect(cases!.every(isDraft)).toBe(true);
  });

  it("finds a vague label, a repeated id and a label that is one of our industries", () => {
    const vague = { ...FLORIST, input: { ...FLORIST.input, label: "Consultant" } };
    const ours = { ...FLORIST, id: "of-901-x", input: { ...FLORIST.input, label: "Coffee shop" } };
    expect(datasetProblems([FLORIST, vague, ours], INDUSTRIES)).toEqual([
      'of-900-fixture: repeated id',
      'of-900-fixture: label "Consultant" is too vague',
      'of-901-x: "Coffee shop" is one of our industries',
    ]);
  });
});

describe("other fit grader", () => {
  it("fails advice, a missing city and the business's own name in code, before any judge", () => {
    expect(codeProblem("Which florist in Orange, CA does the best wedding flowers?", FLORIST)).toBeNull();
    expect(codeProblem("How much do wedding flowers cost in Orange, CA?", FLORIST)).toMatch(/fair/);
    expect(codeProblem("Which florist does the best wedding flowers?", FLORIST)).toMatch(/city/);
    expect(codeProblem("Is Petal and Stem the best florist in Orange, CA?", FLORIST)).toMatch(/names the business/);
  });

  it("sends only questions that pass the code checks to the judge, and counts a skipped answer as a fail", async () => {
    const asked: string[][] = [];
    const graded = await gradeQuestions(fakeJudge(asked), FLORIST, [
      "Which florist in Orange, CA does the best wedding flowers?",
      "Which gym in Orange, CA has the best trainers?",
      "How much do wedding flowers cost in Orange, CA?",
      "Which florist in Orange, CA do brides recommend?",
    ]);
    expect(asked).toEqual([["1. Which florist in Orange, CA does the best wedding flowers?", "2. Which gym in Orange, CA has the best trainers?", "3. Which florist in Orange, CA do brides recommend?"]]);
    expect(graded.map((g) => [g.pass, g.by])).toEqual([
      [true, "judge"],
      [false, "judge"],
      [false, "code"],
      [false, "judge"],
    ]);
  });

  it("scores the share of relevant questions and keeps API errors apart", () => {
    const q = (pass: boolean) => ({ text: "x", pass, by: "judge" as const, reason: null });
    const graded: OtherFitGraded[] = [
      { id: "a", label: "Florist", questions: [...Array(9).fill(q(true)), q(false)], fit: null, source: "written", apiError: null },
      { id: "b", label: "Gym", questions: null, fit: null, source: null, apiError: "anthropic: 529" },
    ];
    expect(relevance(graded)).toMatchObject({ cases: 2, scored: 1, apiErrors: 1, questions: 10, relevant: 9, share: 0.9, passed: true });
  });
});

describe("the real flow on a fixture writer", () => {
  it("writes questions for a dataset business that pass the code checks", async () => {
    const c = cases![0];
    const kind = c.input.label.toLowerCase();
    const model: QuestionModel = {
      pick: async () => [],
      write: async () => [
        { template: `What is the best ${kind} in {city}?`, intent: "best" },
        { template: `Which ${kind} in {city} has the best reviews?`, intent: "reviews" },
        { template: `Which ${kind} in {city} has fair prices?`, intent: "price" },
        { template: `Which ${kind} in {city} do locals recommend?`, intent: "reviews" },
        { template: `Which ${kind} in {city} is best for children's books?`, intent: "comparison" },
        { template: `Which ${kind} in {city} has the friendliest staff?`, intent: "best" },
        { template: `Which ${kind} in {city} has the widest choice?`, intent: "comparison" },
      ],
      fit: async ({ questions }) => questions.map(() => true),
    };
    const set = await prepareQuestions(questionBusiness(c), { loadLibrary: async () => [], model });
    expect(set.source).toBe("written");
    expect(set.fit?.rounds).toBe(1);
    expect(set.questions.map((q) => codeProblem(q.text, c)).filter(Boolean)).toEqual([]);
  });
});
