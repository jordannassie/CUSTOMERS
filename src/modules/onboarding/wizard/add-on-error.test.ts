import { beforeEach, describe, expect, it, vi } from "vitest";

// BUG-252: a failed price check for a business added during a trial blanked the whole models step ("This step
// didn't load"). Now the step gets the reason instead, and the real error is logged.
const preview = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
  getCurrentAgency: vi.fn(async () => ({ id: "agency-1" })),
}));
vi.mock("@/modules/billing", () => {
  class PlanChangeError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return { PlanChangeError, previewSetupAddOn: (...args: unknown[]) => preview(...args) };
});

const { ADD_ON_UNAVAILABLE, getSetupAddOn } = await import("./queries");
const { PlanChangeError } = await import("@/modules/billing");

beforeEach(() => {
  preview.mockReset();
});

describe("getSetupAddOn when the price check fails (BUG-252)", () => {
  it("returns the reason instead of throwing for a Stripe error, and logs what Stripe said", async () => {
    preview.mockImplementation(async () => {
      throw Object.assign(new Error("No such price"), { type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 400 });
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getSetupAddOn("business-1", "/onboarding/models")).toEqual({ unavailable: ADD_ON_UNAVAILABLE });
    expect(log).toHaveBeenCalledWith(
      "[onboarding/models] setup add-on preview failed",
      expect.objectContaining({ agencyId: "agency-1", businessId: "business-1", type: "StripeInvalidRequestError", code: "resource_missing" }),
    );
    log.mockRestore();
  });

  it("passes a plan-change rule's own words on", async () => {
    preview.mockImplementation(async () => {
      throw new PlanChangeError(409, "Remove 2 competitors first: Starter allows 5.");
    });
    expect(await getSetupAddOn("business-1", "/onboarding/models")).toEqual({ unavailable: "Remove 2 competitors first: Starter allows 5." });
  });

  it("returns the preview when it works", async () => {
    const addOn = { planId: "starter", planName: "Starter", priceCents: 14900, trialing: true, todayCents: 0, previewedAt: 1 };
    preview.mockImplementation(async () => addOn);
    expect(await getSetupAddOn("business-1", "/onboarding/models")).toEqual(addOn);
  });
});
