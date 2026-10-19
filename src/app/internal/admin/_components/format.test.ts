import { describe, expect, it } from "vitest";
import { formatDate, money } from "./format";

describe("admin formats (2026-10-19)", () => {
  it("writes every admin date one way, in UTC", () => {
    expect(formatDate("2026-10-14T14:05:00Z", true)).toBe("Oct 14, 2026, 2:05 PM UTC");
    expect(formatDate("2026-10-14T23:30:00-05:00", true)).toBe("Oct 15, 2026, 4:30 AM UTC");
    expect(formatDate("2026-10-14T14:05:00Z")).toBe("Oct 14, 2026 UTC");
  });

  it("writes money with 2 decimals from $1 and 4 below", () => {
    expect(money(1234.5)).toBe("$1,234.50");
    expect(money(12)).toBe("$12.00");
    expect(money(1)).toBe("$1.00");
    expect(money(0.0042)).toBe("$0.0042");
    expect(money(0.5)).toBe("$0.5000");
    expect(money(0)).toBe("$0.00");
    expect(money(-0.25)).toBe("-$0.2500");
    expect(money(null)).toBe("");
  });
});
