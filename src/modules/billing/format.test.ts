import { describe, expect, it } from "vitest";
import { estimateMonthlyCredits, formatCount, formatUsd } from "./format";

describe("pricing format", () => {
  it("formats cents as dollars without trailing zeros", () => {
    expect(formatUsd(14900)).toBe("$149");
    expect(formatUsd(18000)).toBe("$180");
    expect(formatUsd(14950)).toBe("$149.50");
    expect(formatUsd(250000)).toBe("$2,500");
  });

  it("formats counts with thousands separators", () => {
    expect(formatCount(1200)).toBe("1,200");
  });

  it("matches the MVP_SPEC 4.3 credit example", () => {
    expect(estimateMonthlyCredits(12, 3, "weekly")).toBe(155);
    expect(estimateMonthlyCredits(10, 3, "daily")).toBe(900);
  });
});
