// Code-only checks, no provider call, so they run on every pull request: the grader, the dataset
// format, and the real picking flow fed with a fixture library and fixture model answers.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "@/modules/onboarding/question-fixtures";
import { prepareQuestions } from "@/modules/onboarding/questions";
import { apiErrorCase, EXAMPLE_PATH, gradeCase, loadDataset, parseDataset, PASS_OVERLAP, poolNotInLibrary, score } from "./grader";

const examples = parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: true });
const templateById = new Map(COFFEE_LIBRARY.map((e) => [e.id, e.template]));

// Fixture model answers for each example row, standing in for Claude Haiku.
const fixturePicks: Record<string, number[] | Error> = {
  "qp-example-1": COFFEE_GOOD_PICK,
  "qp-example-2": new Error("529 overloaded"),
};

describe("question picking grader", () => {
  it("reads the example rows, and refuses them as labelled data", () => {
    expect(examples.map((c) => c.id)).toEqual(Object.keys(fixturePicks));
    expect(() => parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: false })).toThrow(/example rows/);
  });

  it("scores the share of picks in the acceptable pool and lists the misses", () => {
    const [coffee] = examples;
    const picked = [...coffee.acceptable.slice(0, 9), "Which cafe in {city} is best for bubble tea?", "x {city}?", "y {city}?"];
    const graded = gradeCase(coffee, picked, "library");
    expect(graded.overlap).toBe(0.75);
    expect(graded.missing).toEqual(["Which cafe in {city} is best for bubble tea?", "x {city}?", "y {city}?"]);
  });

  it("checks that every pool entry is a library template", () => {
    const [coffee] = examples;
    expect(poolNotInLibrary(coffee, COFFEE_LIBRARY.map((e) => e.template))).toEqual([]);
    expect(poolNotInLibrary({ ...coffee, acceptable: ["Best cafe in {city}?"] }, COFFEE_LIBRARY.map((e) => e.template))).toEqual([
      "Best cafe in {city}?",
    ]);
  });

  it("keeps API errors out of the score and counts them separately", () => {
    const [a, b] = examples;
    const result = score([gradeCase(a, a.acceptable.slice(0, 12), "library"), apiErrorCase(b, "529 overloaded")]);
    expect(result).toMatchObject({ total: 2, scored: 1, apiErrors: 1, meanOverlap: 1, passed: true, passLevel: PASS_OVERLAP });
  });

  it("validates dataset.v1.jsonl when a person has added it", () => {
    const dataset = loadDataset();
    if (dataset === null) return;
    expect(dataset.length).toBeGreaterThanOrEqual(20);
    expect(new Set(dataset.map((c) => c.id)).size).toBe(dataset.length);
  });
});

describe("question picking on fixtures", () => {
  it("scores a good pick 1, and a fallback run 0 (not an API error: the user still got questions)", async () => {
    const graded = [];
    for (const c of examples) {
      const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: fixturePicks[c.id] });
      const set = await prepareQuestions(c.input, clients);
      const picked = set.questions.flatMap((q) => (q.templateId ? [templateById.get(q.templateId) ?? ""] : []));
      graded.push(gradeCase(c, picked, set.source));
    }
    expect(graded.map((g) => [g.source, g.overlap])).toEqual([
      ["library", 1],
      ["fallback", 0],
    ]);
    expect(score(graded)).toMatchObject({ scored: 2, fallbacks: 1, meanOverlap: 0.5, passed: false });
  });
});
