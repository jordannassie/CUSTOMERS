import { describe, expect, it } from "vitest";
import { HOUR, NOW } from "../scoring.test-helpers";
import { answerKeys } from "./answer-keys";

describe("answerKeys", () => {
  const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * HOUR);

  it("treats a cache hit within 24 hours of the answer's first check as the same answer", () => {
    const keys = answerKeys([
      {
        id: "fresh",
        provider: "openai",
        questionId: "q1",
        checkedAt: at(30),
        cached: false,
      },
      {
        id: "hit",
        provider: "openai",
        questionId: "q1",
        checkedAt: at(20),
        cached: true,
      },
      {
        id: "later-hit",
        provider: "openai",
        questionId: "q1",
        checkedAt: at(5),
        cached: true,
      },
      {
        id: "other-model",
        provider: "anthropic",
        questionId: "q1",
        checkedAt: at(20),
        cached: true,
      },
      {
        id: "fresh-again",
        provider: "openai",
        questionId: "q1",
        checkedAt: at(4),
        cached: false,
      },
    ]);
    expect(keys.get("hit")).toBe("fresh");
    // 25 hours after "fresh": that cached answer had expired, so this is a new one.
    expect(keys.get("later-hit")).toBe("later-hit");
    expect(keys.get("other-model")).toBe("other-model");
    expect(keys.get("fresh-again")).toBe("fresh-again");
  });
});
