import { describe, expect, it } from "vitest";
import { formatCount, formatUsd } from "./format";

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
});
