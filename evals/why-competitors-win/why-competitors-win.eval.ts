// Code-only checks, no model call, so they run on every pull request: the dataset format, the code
// grader on the example rows, the real explain flow fed with fixtures, and the Haiku grader's wiring
// and agreement maths with a fake judge.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { explain } from "@/modules/insights/explain";
import { COFFEE_SOURCES, PLUMBER_SOURCES } from "@/modules/insights/fixtures";
import { EXPLAIN_MODEL } from "@/modules/insights/prompts/explain.v1";
import { templateWriter } from "@/modules/insights/template-writer";
import { assertNotSelfGrading, JUDGE_MODEL, type Judge } from "../shared/judge";
import {
  agreement,
  codeGrade,
  EXAMPLE_PATH,
  JUDGE_SYSTEM,
  judgeExplanation,
  loadDataset,
  parseDataset,
  score,
  type Verdicts,
} from "./grader";

const examples = parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: true });
const PASS: Verdicts = { grounded: true, specific: true, actionable: true, noInventedNumbers: true };

describe("why competitors win grader", () => {
  it("reads the example rows, and refuses them as labelled data", () => {
    expect(examples.map((c) => c.id)).toEqual(["wcw-example-1", "wcw-example-2", "wcw-example-3"]);
    expect(() => parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: false })).toThrow(/example rows/);
  });

  it("code grader passes the good examples and catches the invented Google number", () => {
    const [good, bad, plumber] = examples;
    expect(codeGrade(good.calibration.output, good.input)).toEqual({ pass: true, issues: [] });
    expect(codeGrade(plumber.calibration.output, plumber.input)).toEqual({ pass: true, issues: [] });
    expect(codeGrade(bad.calibration.output, bad.input).issues).toEqual(["reason 1: number not in the facts: 320"]);
  });

  it("the writer and the grader are different models (principle 5)", () => {
    expect(JUDGE_MODEL).toBe("claude-haiku-4-5");
    expect(() => assertNotSelfGrading(EXPLAIN_MODEL)).not.toThrow();
    expect(JUDGE_SYSTEM).toContain("noInventedNumbers");
  });

  it("sends the facts and the explanation to the judge, and scores agreement with people", async () => {
    const seen: string[] = [];
    // Fake judge: fails "grounded" whenever the explanation writes 320, and always passes the rest.
    const fake: Judge = async (req) => {
      seen.push(req.user);
      return req.schema.parse({ ...PASS, grounded: !req.user.includes("320 Google reviews") });
    };
    const pairs = [];
    for (const c of examples) pairs.push({ judge: await judgeExplanation(fake, c.input, c.calibration.output), human: c.calibration.human });
    expect(seen[0]).toContain("<facts>");
    expect(seen[0]).toContain("<explanation>");
    const result = agreement(pairs);
    // Example 2: the fake judge gets "grounded" right but misses the other 3 failures.
    expect(result).toMatchObject({ cases: 3, byItem: { grounded: 1, specific: 2 / 3 }, trusted: false });
    expect(result.overall).toBeCloseTo(9 / 12);
  });

  it("keeps API errors out of the scores", () => {
    const result = score([
      { id: "a", output: null, code: null, judge: null, pass: false, apiError: "anthropic returned 529" },
      { id: "b", output: { reasons: [] }, code: { pass: true, issues: [] }, judge: PASS, pass: true, apiError: null },
    ]);
    expect(result).toEqual({ total: 2, scored: 1, apiErrors: 1, codePassRate: 1, passRate: 1 });
  });

  it("validates dataset.v1.jsonl when a person has added it", () => {
    const dataset = loadDataset();
    if (dataset === null) return;
    expect(dataset.length).toBeGreaterThanOrEqual(20);
    expect(new Set(dataset.map((c) => c.id)).size).toBe(dataset.length);
  });
});

describe("explain on fixtures", () => {
  it("the real flow with the template writer passes the code grader", async () => {
    for (const src of [COFFEE_SOURCES, PLUMBER_SOURCES]) {
      const result = await explain(src, templateWriter);
      expect(result).toMatchObject({ source: "ai", dropped: [] });
    }
  });
});
