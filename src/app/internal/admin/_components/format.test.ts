import { describe, expect, it } from "vitest";
import { formatDate, money, plural, singular, unitPrice } from "./format";

describe("admin formats (2026-10-19)", () => {
  it("writes every admin date one way, in UTC", () => {
    expect(formatDate("2026-10-14T14:05:00Z", true)).toBe("Oct 14, 2026, 2:05 PM UTC");
    expect(formatDate("2026-10-14T23:30:00-05:00", true)).toBe("Oct 15, 2026, 4:30 AM UTC");
    expect(formatDate("2026-10-14T14:05:00Z")).toBe("Oct 14, 2026 UTC");
  });

  it("writes money with 2 decimals, and says when it is under a cent (2026-11-12)", () => {
    expect(money(1234.5)).toBe("$1,234.50");
    expect(money(12)).toBe("$12.00");
    expect(money(0.9581)).toBe("$0.96");
    expect(money(0.5)).toBe("$0.50");
    expect(money(0.0042)).toBe("Under $0.01");
    expect(money(0)).toBe("$0.00");
    expect(money(-0.25)).toBe("-$0.25");
    expect(money(null)).toBe("");
  });

  it("writes per-check prices with 4 decimals", () => {
    expect(unitPrice(0.0042)).toBe("$0.0042");
    expect(unitPrice(0.09)).toBe("$0.0900");
    expect(unitPrice(null)).toBe("");
  });

  it("uses the singular for one", () => {
    expect(plural(1, "agency", "agencies")).toBe("1 agency");
    expect(plural(1200, "scan", "scans")).toBe("1,200 scans");
    expect(singular("agencies")).toBe("agency");
    expect(singular("businesses")).toBe("business");
    expect(singular("scans")).toBe("scan");
    expect(singular("changes")).toBe("change");
  });
});
