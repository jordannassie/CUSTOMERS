import { describe, expect, it, vi } from "vitest";
import { setupAddOnText } from "./setup-add-on-copy";

vi.mock("server-only", () => ({}));
// The plan-change data comes from a fake, and Stripe is never reached: a past-due refusal comes before billingAccess.
const loaded = vi.hoisted(() => ({ context: null as unknown }));
vi.mock("./dal", () => ({ loadPlanChangeData: async () => ({ context: loaded.context, plansByProduct: new Map() }), raiseScheduleLost: async () => {} }));
vi.mock("../account/access", () => ({
  billingAccess: async () => {
    throw new Error("setup add-on tests must not reach Stripe");
  },
}));
const { addBusinessAtSetup, chosenPlanFor, planForNewBusiness, previewSetupAddOn } = await import("./setup-add-on");
const { PAST_DUE_REFUSAL } = await import("./copy");

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

describe("finishing setup while the last payment failed", () => {
  const pastDue = { ...context([{ id: "b1", planId: "starter" }, { id: "b2", planId: null }]), agencyStatus: "past_due" };

  it("refuses to add the business, so it is never set up unbilled", async () => {
    loaded.context = pastDue;
    expect(await addBusinessAtSetup("a1", "b2", { planId: "starter", previewedAt: 1 })).toEqual({ ok: false, status: 402, error: PAST_DUE_REFUSAL });
    await expect(previewSetupAddOn("a1", "b2")).rejects.toMatchObject({ status: 402, message: PAST_DUE_REFUSAL });
  });

  it("still adds nothing for a business already on the plan, or an agency with no subscription", async () => {
    loaded.context = pastDue;
    expect(await addBusinessAtSetup("a1", "b1", null)).toEqual({ ok: true });
    loaded.context = { ...pastDue, subscriptionId: null };
    expect(await addBusinessAtSetup("a1", "b2", null)).toEqual({ ok: true });
  });
});
