import { describe, expect, it } from "vitest";
import { needsOverdraftConfirm, overdraftNeeded, overdraftWarning, scanCreditCheck } from "./overdraft";

describe("scanCreditCheck (D-54)", () => {
  it("starts at once when the balance covers the scan", () => {
    expect(scanCreditCheck(100, 36)).toEqual({ kind: "ok" });
    expect(scanCreditCheck(36, 36)).toEqual({ kind: "ok" });
  });

  it("warns when the scan costs more than a balance above 0", () => {
    expect(scanCreditCheck(28, 36)).toEqual({ kind: "warn", cost: 36, balance: 28, extra: 8 });
    expect(scanCreditCheck(32, 33)).toEqual({ kind: "warn", cost: 33, balance: 32, extra: 1 });
    expect(scanCreditCheck(1, 36)).toEqual({ kind: "warn", cost: 36, balance: 1, extra: 35 });
  });

  it("refuses at 0 or below, whatever the scan costs", () => {
    expect(scanCreditCheck(0, 36)).toEqual({ kind: "refuse" });
    expect(scanCreditCheck(-8, 36)).toEqual({ kind: "refuse" });
    expect(scanCreditCheck(0, 0)).toEqual({ kind: "refuse" });
  });

  it("lets a scan with nothing to check through, so the worker gives its own reason", () => {
    expect(scanCreditCheck(5, 0)).toEqual({ kind: "ok" });
  });
});

describe("overdraftWarning", () => {
  it("names the cost, the balance and the extra credits", () => {
    expect(overdraftWarning({ cost: 36, balance: 28, extra: 8 })).toBe(
      "This scan uses 36 credits and you have 28. It will still finish, and the 8 extra credits come out of your next renewal or top-up.",
    );
  });

  it("uses the singular for 1 extra credit", () => {
    expect(overdraftWarning({ cost: 33, balance: 32, extra: 1 })).toBe(
      "This scan uses 33 credits and you have 32. It will still finish, and the 1 extra credit comes out of your next renewal or top-up.",
    );
  });

  it("has no long dashes", () => {
    expect(overdraftWarning({ cost: 9, balance: 2, extra: 7 })).not.toMatch(/[–—]/);
  });
});

describe("overdraftNeeded", () => {
  it("is a 402 the screens can tell apart from other refusals", () => {
    const result = overdraftNeeded({ kind: "warn", cost: 36, balance: 28, extra: 8 });
    expect(result).toMatchObject({ ok: false, status: 402, overdraft: { cost: 36, balance: 28 } });
    expect(needsOverdraftConfirm(result)).toBe(true);
    expect(needsOverdraftConfirm({ ok: false, status: 403, error: "You're out of credits. Buy a top-up or upgrade." })).toBe(false);
  });
});
