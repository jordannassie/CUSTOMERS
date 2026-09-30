import { describe, expect, it } from "vitest";
import { AGENCY_PROGRAM_PRODUCT, LAUNCH_KIT_PRODUCT } from "./constants";
import type Stripe from "stripe";

function isLaunchKitByMetadata(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.product === LAUNCH_KIT_PRODUCT && session.mode === "payment";
}

function isAgencyByMetadata(product?: string): boolean {
  return product === AGENCY_PROGRAM_PRODUCT;
}

describe("launch funnel event detection", () => {
  it("treats checkout metadata product=launch_kit as a kit session", () => {
    const session = {
      mode: "payment",
      metadata: { product: LAUNCH_KIT_PRODUCT },
    } as unknown as Stripe.Checkout.Session;
    expect(isLaunchKitByMetadata(session)).toBe(true);
  });

  it("ignores ordinary business-plan checkouts", () => {
    const session = {
      mode: "subscription",
      metadata: { plan_id: "starter" },
    } as unknown as Stripe.Checkout.Session;
    expect(isLaunchKitByMetadata(session)).toBe(false);
    expect(isAgencyByMetadata("starter")).toBe(false);
  });

  it("treats agency_program metadata as an agency event", () => {
    expect(isAgencyByMetadata(AGENCY_PROGRAM_PRODUCT)).toBe(true);
  });
});
