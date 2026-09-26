import { describe, expect, it } from "vitest";
import { checkCostUsd } from "./pricing";

describe("checkCostUsd", () => {
  it("bills cached input at the cached rate and adds the per-search fee", () => {
    const usage = { inputTokens: 10_000, cachedInputTokens: 4_000, outputTokens: 500, searchCalls: 2 };
    // 6000 * 0.40/1M + 4000 * 0.10/1M + 500 * 1.60/1M + 2 * $0.01
    expect(checkCostUsd("gpt-4.1-mini", usage)).toBe(0.0236);
  });

  it("costs only tokens when the model did not search", () => {
    const usage = { inputTokens: 1_000_000, cachedInputTokens: 0, outputTokens: 0, searchCalls: 0 };
    expect(checkCostUsd("gpt-4.1-mini", usage)).toBe(0.4);
  });
});
