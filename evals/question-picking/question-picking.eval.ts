// Code-only checks, no provider call, so they run on every pull request: the grader, the dataset
// format, and the real picking flow fed with a fixture library and fixture model answers.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COFFEE_FULL_BUSINESS, COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "@/modules/onboarding/question-fixtures";
import { prepareQuestions } from "@/modules/onboarding/questions";
import { isFairQuestion } from "@/modules/onboarding/question-rules";
import { apiErrorCase, EXAMPLE_PATH, gradeCase, LIBRARY_PATH, loadDataset, parseDataset, PASS_OVERLAP, poolNotInLibrary, score } from "./grader";

const examples = parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: true });
const templateById = new Map(COFFEE_LIBRARY.map((e) => [e.id, e.template]));

// Fixture model answers for each example row, standing in for the live model.
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
    // v4: only fitting templates reach the model. The kiosk lists two services, so few enough templates fit that no
    // pick call is made and the fixture outage never reaches it.
    expect(graded.map((g) => [g.source, g.overlap])).toEqual([
      ["library", 1],
      ["library", 1],
    ]);
    expect(score(graded)).toMatchObject({ scored: 2, fallbacks: 0, meanOverlap: 1, passed: true });
  });

  it("scores a fallback run 0 when the pick call fails (not an API error: the user still got questions)", async () => {
    const [, kiosk] = examples;
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: new Error("529 overloaded") });
    // A shop listing every service in the fixture library needs a pick call, so the outage reaches it.
    const set = await prepareQuestions({ ...COFFEE_FULL_BUSINESS, city: kiosk.input.city, region: kiosk.input.region }, clients);
    const graded = gradeCase(kiosk, set.questions.flatMap((q) => (q.templateId ? [templateById.get(q.templateId) ?? ""] : [])), set.source);
    expect([graded.source, graded.overlap]).toEqual(["fallback", 0]);
    expect(score([graded])).toMatchObject({ scored: 1, fallbacks: 1, passed: false });
  });
});

// 2026-10-16: the rules that drop choices, unfinished questions and brands (question-options.ts, question-brands.ts)
// took 31 of the 399 templates. Every industry must still have plenty to pick from.
describe("the reviewed library under the question rules", () => {
  it("keeps at least 25 fair templates per industry", () => {
    if (!existsSync(LIBRARY_PATH)) return;
    const file = JSON.parse(readFileSync(LIBRARY_PATH, "utf8")) as { templates: { industry: string; template: string }[] };
    const fair = new Map<string, number>();
    for (const t of file.templates) fair.set(t.industry, (fair.get(t.industry) ?? 0) + (isFairQuestion(t.template) ? 1 : 0));
    for (const [industry, n] of fair) expect(n, industry).toBeGreaterThanOrEqual(25);
  });
});
