// Code-only checks, no model call, so they run on every pull request: the code grader on hand-written writer
// answers, the real wordFixes flow fed with those answers, the dataset format, and the judge's wiring and agreement
// maths with a fake judge.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIX_WORDING_MODEL, fixWordingOutput } from "@/modules/reports/prompts/fix-wording.v1";
import { fixSchema } from "@/modules/reports/v2/snapshot-schema";
import { wordFixesWithReport } from "@/modules/reports/v2/wording/word-fixes";
import { JUDGE_MODEL, modelFamily, OPENAI_JUDGE_MODEL, type Judge } from "../shared/judge";
import { FIXTURE_CASES } from "./cases";
import { agreement, codeGrade, EXAMPLE_PATH, JUDGE_SYSTEM, judgeWording, loadDataset, parseDataset, score, type Verdicts } from "./grader";

const PASS: Verdicts = { faithful: true, grounded: true, plain: true, actionable: true };
const examples = parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: true });

describe("report fix wording code grader", () => {
  it.each(FIXTURE_CASES)("$id", ({ snapshot, output, expected }) => {
    const grade = codeGrade(output, snapshot);
    expect(grade.issues.map((i) => (i.startsWith("schema:") ? "schema" : i))).toEqual(expected);
    expect(grade.pass).toBe(expected.length === 0);
  });

  it("the real flow keeps exactly the fixes the grader passes, and the result still fits the report schema", async () => {
    for (const c of FIXTURE_CASES) {
      const parsed = fixWordingOutput.safeParse(c.output);
      if (!parsed.success) continue;
      const writer = async () => ({ output: parsed.data, model: FIX_WORDING_MODEL, usage: null });
      const { fixes, report } = await wordFixesWithReport(c.snapshot.fixes, c.snapshot, { writer, log: () => {} });
      const failing = new Set(codeGrade(c.output, c.snapshot).issues.map((i) => i.split(": ")[0]));
      const passing = c.snapshot.fixes.map((f) => f.key).filter((k) => !failing.has(k));
      expect(report.kept, c.id).toEqual(passing);
      for (const f of fixes) {
        expect(fixSchema.safeParse(f).success, `${c.id} ${f.key}`).toBe(true);
        expect(f.steps.length).toBeGreaterThanOrEqual(2);
        expect(f.steps.length).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("report fix wording dataset and judge", () => {
  it("reads the example rows, and refuses them as labelled data", () => {
    expect(examples.map((c) => c.id)).toEqual(["rfw-example-1", "rfw-example-2", "rfw-example-3"]);
    expect(() => parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: false })).toThrow(/example rows/);
    expect(examples.map((c) => codeGrade(c.calibration.output, c.snapshot).pass)).toEqual([true, true, false]);
  });

  it("the judge is from the other model family than the writer (principle 5)", () => {
    expect(FIX_WORDING_MODEL).toBe("claude-sonnet-5");
    expect(modelFamily(FIX_WORDING_MODEL)).not.toBe(modelFamily(OPENAI_JUDGE_MODEL));
    // With EVAL_AI_PROVIDER=openai the writer is gpt-4.1, so Claude Haiku judges.
    expect(modelFamily("gpt-4.1")).not.toBe(modelFamily(JUDGE_MODEL));
    expect(JUDGE_SYSTEM).toContain("faithful");
  });

  it("sends the facts and the rewrite to the judge, and scores agreement with people", async () => {
    const seen: string[] = [];
    // Fake judge: passes everything, so it misses the person's "grounded" fail on example 3.
    const fake: Judge = async (req) => {
      seen.push(req.user);
      return req.schema.parse(PASS);
    };
    const pairs = [];
    for (const c of examples) pairs.push({ judge: await judgeWording(fake, c.snapshot, c.calibration.output), human: c.calibration.human });
    expect(seen[0]).toContain("<facts>");
    expect(seen[0]).toContain("<rewrite>");
    expect(seen[0]).toContain('"draft"');
    const result = agreement(pairs);
    expect(result).toMatchObject({ cases: 3, byItem: { grounded: 2 / 3, plain: 1 }, trusted: true });
    expect(result.overall).toBeCloseTo(11 / 12);
  });

  it("keeps API errors out of the scores", () => {
    const result = score([
      { id: "a", output: null, code: null, judge: null, pass: false, apiError: "anthropic returned 529" },
      { id: "b", output: { fixes: [] }, code: { pass: true, issues: [] }, judge: PASS, pass: true, apiError: null },
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
