import { describe, expect, it } from "vitest";
import { canOpen, nextStepNumber, resumeStep, visibleSteps, type WizardState } from "./steps";

const fresh: WizardState = { hasAgency: false, draft: null, hasFinishedBusiness: false };
const withAgency: WizardState = { ...fresh, hasAgency: true };
const at = (step: number | null): WizardState => ({ ...withAgency, draft: { id: "b1", step } });

describe("resumeStep", () => {
  it("starts with the agency, then the website", () => {
    expect(resumeStep(fresh)).toBe("agency");
    expect(resumeStep(withAgency)).toBe("website");
  });

  it("continues at the saved step of the draft business", () => {
    expect(resumeStep(at(4))).toBe("details");
    expect(resumeStep(at(5))).toBe("competitors");
    expect(resumeStep(at(7))).toBe("models");
  });

  it("treats a draft with no step (an older wizard's row) as needing details", () => {
    expect(resumeStep(at(null))).toBe("details");
  });

  it("has nothing to do when every business is set up", () => {
    expect(resumeStep({ ...withAgency, hasFinishedBusiness: true })).toBeNull();
  });
});

describe("canOpen", () => {
  it("never skips ahead of the saved step", () => {
    expect(canOpen("website", fresh)).toBe(false);
    expect(canOpen("details", withAgency)).toBe(false);
    expect(canOpen("questions", at(5))).toBe(false);
  });

  it("lets the user go back to any step already passed", () => {
    expect(canOpen("agency", at(6))).toBe(true);
    expect(canOpen("website", at(6))).toBe(true);
    expect(canOpen("details", at(6))).toBe(true);
    expect(canOpen("questions", at(6))).toBe(true);
  });
});

describe("visibleSteps", () => {
  it("runs the business steps only for a second business", () => {
    expect(visibleSteps(withAgency).map((s) => s.slug)[0]).toBe("agency");
    expect(visibleSteps({ ...withAgency, hasFinishedBusiness: true }).map((s) => s.slug)).toEqual([
      "website",
      "details",
      "competitors",
      "questions",
      "models",
    ]);
  });
});

describe("nextStepNumber", () => {
  it("moves on after a save, and never back when an earlier step is edited", () => {
    expect(nextStepNumber(null, "website")).toBe(4);
    expect(nextStepNumber(4, "details")).toBe(5);
    expect(nextStepNumber(7, "details")).toBe(7);
  });
});
