import { describe, expect, it, vi } from "vitest";
import { setupAddOnText } from "./setup-add-on-copy";

vi.mock("server-only", () => ({}));
const { chosenPlanFor, planForNewBusiness } = await import("./setup-add-on");

const plans = [
  { id: "starter", name: "Starter", priceCents: 14900, stripePriceId: "price_s" },
  { id: "pro", name: "Pro", priceCents: 24900, stripePriceId: "price_p" },
];
const context = (businesses: { id: string; planId: string | null }[]) => ({
  agencyId: "a1",
  agencyStatus: "trialing",
  subscriptionId: "sub_1",
  plans,
  businesses: businesses.map((b) => ({ ...b, name: b.id, itemId: b.planId ? `si_${b.id}` : null })),
});

describe("setupAddOnText (BUG-071)", () => {
  it("says a business added on a trial is free until the trial ends", () => {
    expect(setupAddOnText({ planName: "Starter", priceCents: 14900, trialing: true, todayCents: 0 })).toBe(
      "This business joins your Starter plan. It's free during your trial, then $149 a month.",
    );
  });

  it("says what a paid plan charges today before finishing (D-57)", () => {
    expect(setupAddOnText({ planName: "Pro", priceCents: 24900, trialing: false, todayCents: 12450 })).toBe(
      "This business joins your Pro plan for $249 a month. Finishing setup charges $124.50 today for the rest of this billing period.",
    );
  });
});

describe("planForNewBusiness", () => {
  it("puts a new business on the plan the agency's other businesses use", () => {
    expect(planForNewBusiness(context([{ id: "b1", planId: "pro" }, { id: "b2", planId: null }]) as never, "b2")).toBe("pro");
  });

  it("falls back to Starter when no business is on a plan yet", () => {
    expect(planForNewBusiness(context([{ id: "b2", planId: null }]) as never, "b2")).toBe("starter");
  });
});

describe("chosenPlanFor", () => {
  const ctx = context([{ id: "b1", planId: "starter" }, { id: "b2", planId: null }]) as never;

  it("uses the plan picker's choice over the other businesses' plan", () => {
    expect(chosenPlanFor(ctx, "b2", "pro")).toBe("pro");
  });

  it("falls back to auto-matching when nothing was chosen", () => {
    expect(chosenPlanFor(ctx, "b2", null)).toBe("starter");
    expect(chosenPlanFor(ctx, "b2", undefined)).toBe("starter");
  });

  it("falls back when the chosen plan is no longer on sale here", () => {
    expect(chosenPlanFor(ctx, "b2", "enterprise")).toBe("starter");
  });
});
