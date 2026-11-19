import { describe, expect, it } from "vitest";
import { paidNotActive, paidNotActiveMessage } from "./service";

// 2026-10-15: Stripe has the plan paid and active, but the app still shows a trial (a missed webhook).
describe("paid_not_active", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);

  it("flags a plan active in Stripe for more than 5 minutes after its trial ended", () => {
    expect(paidNotActive({ status: "active", trial_end: at("2026-10-15T11:54:00Z") }, now)).toBe(true);
    expect(paidNotActive({ status: "active", trial_end: at("2026-10-15T11:57:00Z") }, now)).toBe(false);
  });

  it("leaves trials, unpaid plans and plans that never had a trial alone", () => {
    expect(paidNotActive({ status: "trialing", trial_end: at("2026-10-20T00:00:00Z") }, now)).toBe(false);
    expect(paidNotActive({ status: "past_due", trial_end: at("2026-10-14T00:00:00Z") }, now)).toBe(false);
    expect(paidNotActive({ status: "active", trial_end: null }, now)).toBe(false);
  });

  it("names the agencies", () => {
    expect(paidNotActiveMessage(["Rooter Compare Agency"])).toMatch(/^1 agency \(Rooter Compare Agency\) is paid and active in Stripe/);
    expect(paidNotActiveMessage(["A", "B", "C", "D", "E", "F"])).toMatch(/^6 agencies \(A, B, C, D, E, and more\) are/);
  });
});
