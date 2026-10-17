import { describe, expect, it } from "vitest";
import { overLimit } from "./limits";

const starter = { name: "Starter", max_competitors: 5, max_questions: 25 };

describe("overLimit (BUG-244)", () => {
  it("lets a draft that fits move to the plan", () => {
    expect(overLimit(starter, 5, 25)).toBeNull();
    expect(overLimit({ name: "Pro", max_competitors: null, max_questions: null }, 40, 90)).toBeNull();
  });

  it("says how many competitors to remove first", () => {
    expect(overLimit(starter, 7, 12)).toBe(
      "Starter checks up to 5 competitors and this business has 7. Remove 2 competitors on the competitors step to move it to Starter.",
    );
    expect(overLimit(starter, 6, 12)).toContain("Remove 1 competitor on");
  });

  it("checks questions after competitors", () => {
    expect(overLimit(starter, 3, 26)).toBe(
      "Starter checks up to 25 questions and this business has 26. Remove 1 question on the questions step to move it to Starter.",
    );
  });
});
