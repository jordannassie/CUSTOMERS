import { describe, expect, it } from "vitest";
import { INDUSTRIES } from "@/lib/industries";
import { isFairQuestion } from "@/modules/onboarding";
import {
  editMakesNewQuestion,
  exampleQuestion,
  atLimit,
  newQuestionWarning,
  rowHasAnswers,
  limitText,
  questionsView,
  resultText,
  sameQuestion,
  tidyQuestion,
} from "./service";

describe("questionsView", () => {
  const questions = [
    { id: "q1", prompt: "Best coffee shop in Orange?", active: true, own: false },
    { id: "q2", prompt: "Where can I get oat milk lattes in Orange?", active: true, own: true },
    { id: "q3", prompt: "Coffee shop open early in Orange?", active: false, own: true },
  ];

  it("splits active from paused and gives every chosen model a result, in the business's model order", () => {
    const view = questionsView({
      businessId: "b1",
      city: "Orange",
      models: ["perplexity", "openai"],
      frequency: "weekly",
      questions,
      results: new Map([["q1", [{ model: "openai", appeared: 3, checks: 4 }]]]),
      limit: 25,
    });
    expect(view.active.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(view.paused.map((q) => q.id)).toEqual(["q3"]);
    expect(view.active[0].results).toEqual([
      { model: "perplexity", label: "Perplexity", appeared: 0, checks: 0 },
      { model: "openai", label: "ChatGPT", appeared: 3, checks: 4 },
    ]);
    expect(view.active.map((q) => q.custom)).toEqual([false, true]);
    expect(view.models).toEqual([
      { id: "perplexity", label: "Perplexity" },
      { id: "openai", label: "ChatGPT" },
    ]);
  });
});

describe("wording", () => {
  it("says appeared in X of the last Y checks", () => {
    expect(resultText({ appeared: 3, checks: 4 })).toBe("Appeared in 3 of the last 4 checks");
    expect(resultText({ appeared: 0, checks: 1 })).toBe("Appeared in 0 of the last 1 check");
    expect(resultText({ appeared: 0, checks: 0 })).toBe("Not checked yet");
  });

  it("tidies a typed question the way the library writes them", () => {
    expect(tidyQuestion("  best  vegan cafe in orange  ")).toBe("Best vegan cafe in orange?");
    expect(tidyQuestion("Who fixes leaks fast in Austin.")).toBe("Who fixes leaks fast in Austin?");
    expect(tidyQuestion("Open late?")).toBe("Open late?");
    expect(sameQuestion("best cafe in Orange", "Best cafe in orange?")).toBe(true);
  });

  it("stops at the plan limit with a way forward", () => {
    expect(atLimit(24, 25)).toBe(false);
    expect(atLimit(25, 25)).toBe(true);
    expect(atLimit(500, null)).toBe(false);
    expect(limitText(25)).toBe("You have 25 active questions, the most your plan allows. Pause or remove one to add another.");
  });
});

describe("the example under 'Add your own question' (step 6c)", () => {
  it("is a question our own rules keep, for every kind of business", () => {
    for (const industry of [...INDUSTRIES, null, "something new"]) {
      const example = exampleQuestion("Islamabad", industry);
      expect(isFairQuestion(example), example).toBe(true);
      expect(example).not.toMatch(/open late|weekend|near me/i);
    }
    expect(exampleQuestion("Islamabad", "coffee_shop")).toBe("Which coffee shop in Islamabad do locals recommend most?");
    expect(exampleQuestion(null, "plumber")).toBe("Which plumber in my city do locals recommend most?");
  });
});

describe("editing a question (M2)", () => {
  it("starts a new question for a suggested one, or the user's own once it has answers", () => {
    expect(editMakesNewQuestion({ custom: false, answered: false })).toBe(true);
    expect(editMakesNewQuestion({ custom: false, answered: true })).toBe(true);
    expect(editMakesNewQuestion({ custom: true, answered: true })).toBe(true);
    expect(editMakesNewQuestion({ custom: true, answered: false })).toBe(false);
  });

  it("reads answers from the page's results and words the warning by state", () => {
    const result = (checks: number) => ({ model: "openai" as const, label: "ChatGPT", appeared: 0, checks });
    expect(rowHasAnswers({ results: [result(0), result(0)] })).toBe(false);
    expect(rowHasAnswers({ results: [result(0), result(2)] })).toBe(true);
    expect(newQuestionWarning(true)).toBe("Editing makes this a new question. The old one is paused and keeps its results.");
    expect(newQuestionWarning(false)).toContain("stays paused");
    expect(newQuestionWarning(true)).not.toMatch(/[\u2013\u2014]/);
  });
});
