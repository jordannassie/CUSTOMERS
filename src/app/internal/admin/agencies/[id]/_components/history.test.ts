import { describe, expect, it } from "vitest";
import { ledgerLabel } from "./history";

describe("ledgerLabel (agency credit history)", () => {
  it("shows where granted credits came from instead of 'Credits granted'", () => {
    expect(ledgerLabel({ kind: "grant", source: "trial" })).toBe("Trial");
    expect(ledgerLabel({ kind: "grant", source: "plan" })).toBe("Plan");
    expect(ledgerLabel({ kind: "grant", source: "topup" })).toBe("Top-up");
    expect(ledgerLabel({ kind: "grant", source: "admin" })).toBe("Admin");
    expect(ledgerLabel({ kind: "admin_adjust", source: null })).toBe("Admin");
  });
  it("says which credits expired, and keeps the other rows' words", () => {
    expect(ledgerLabel({ kind: "expire", source: "plan" })).toBe("Plan credits expired");
    expect(ledgerLabel({ kind: "expire", source: null })).toBe("Credits expired");
    expect(ledgerLabel({ kind: "refund", source: "topup" })).toBe("Refunded top-up");
  });
});
