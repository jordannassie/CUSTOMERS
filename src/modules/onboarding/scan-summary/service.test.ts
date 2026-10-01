import { describe, expect, it } from "vitest";
import { aboutInTen, namedMostText, scanProgress } from "./service";

describe("scanProgress", () => {
  it("gives each model its count and the next question it is asking", () => {
    const progress = scanProgress(["openai", "anthropic"], ["q1", "q2", "q3"], new Map([["openai", 2]]));
    expect(progress).toEqual([
      { id: "openai", done: 2, total: 3, asking: "q3" },
      { id: "anthropic", done: 0, total: 3, asking: "q1" },
    ]);
  });

  it("asks nothing once a model has every answer", () => {
    expect(scanProgress(["openai"], ["q1"], new Map([["openai", 4]]))).toEqual([{ id: "openai", done: 1, total: 1, asking: null }]);
  });
});

describe("namedMostText", () => {
  it("picks the business with the highest share of answers, tracked or not", () => {
    const also = { names: [{ name: "Starbucks", answers: 9 }], answers: 12 };
    expect(namedMostText([{ name: "Bean House", score: 58 }], also)).toBe(
      "AI named Starbucks most often, in about 8 of 10 answers.",
    );
    expect(namedMostText([{ name: "Bean House", score: 91 }], also)).toBe(
      "AI named Bean House most often, in about 9 of 10 answers.",
    );
  });

  it("says nothing when AI named no other business", () => {
    expect(namedMostText([{ name: "Bean House", score: 0 }], { names: [], answers: 12 })).toBeNull();
  });
});

describe("aboutInTen", () => {
  it("rounds like the score sentence", () => {
    expect([aboutInTen(3), aboutInTen(66), aboutInTen(100)]).toEqual(["fewer than 1 of 10", "about 7 of 10", "about 10 of 10"]);
  });
});
