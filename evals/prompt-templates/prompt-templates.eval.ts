// Code-only, so it runs on every pull request. Pass level is 100%: one broken prompt fails the suite.
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gradePrompt, loadDataset, promptsFor, type BuiltPrompt } from "./grader";

const cases = loadDataset();

describe("prompt-templates grader", () => {
  const prompt = (text: string, kind: BuiltPrompt["kind"] = "claude"): BuiltPrompt => ({ from: "explanation", kind, text });
  const good =
    "Write a short FAQ answer for the website of Sunrise Coffee Bar that answers the question customers ask most. Leave a clear gap marked [fill in] for every fact I have not given you, and do not invent any details.";

  it("passes a good prompt", () => {
    expect(gradePrompt(prompt(good), "Sunrise Coffee Bar")).toEqual([]);
  });

  it("catches empty placeholders, gaps and missing parts", () => {
    expect(gradePrompt(prompt(good.replace("Sunrise Coffee Bar", "{business.name}")), "Sunrise Coffee Bar")).toEqual([
      "unfilled placeholder",
      "does not name the business",
    ]);
    expect(gradePrompt(prompt(`${good} Our city is undefined.`), "Sunrise Coffee Bar")).toContain("missing value printed");
    expect(gradePrompt(prompt(good.replace("the question", "the question in ,")), "Sunrise Coffee Bar")).toContain(
      "gap where a value is missing",
    );
    expect(gradePrompt(prompt(good.replace("[fill in]", "[address]")), "Sunrise Coffee Bar")).toEqual(["unknown gap: [address]"]);
    expect(gradePrompt(prompt("Write a page for Sunrise Coffee Bar."), "Sunrise Coffee Bar")).toEqual([
      "too short: 36 characters",
      "no rule against inventing facts",
    ]);
    expect(gradePrompt(prompt(`${good} Thanks \u2014 really.`), "Sunrise Coffee Bar")).toContain("long dash");
  });
});

describe("prompt-templates eval", () => {
  it("has 10 to 20 labelled cases with unique ids", () => {
    expect(cases.length).toBeGreaterThanOrEqual(10);
    expect(cases.length).toBeLessThanOrEqual(20);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it("every prompt passes (100%)", async () => {
    const graded = [];
    for (const c of cases) {
      for (const p of await promptsFor(c)) graded.push({ id: c.id, ...p, issues: gradePrompt(p, c.business.name) });
    }
    const failed = graded.filter((g) => g.issues.length > 0);
    mkdirSync(new URL("../results/", import.meta.url), { recursive: true });
    writeFileSync(
      new URL("../results/prompt-templates.latest.json", import.meta.url),
      JSON.stringify({ cases: cases.length, prompts: graded.length, passRate: 1 - failed.length / graded.length, graded }, null, 2),
    );
    // Every source of prompts is covered, not only the checklist.
    expect(new Set(graded.map((g) => g.from))).toEqual(new Set(["explanation", "rules", "checklist website", "checklist reviews"]));
    expect(failed.map(({ id, from, issues }) => ({ id, from, issues }))).toEqual([]);
  });
});
