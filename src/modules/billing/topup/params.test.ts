import { describe, expect, it } from "vitest";
import { REASONS } from "@/modules/entitlements";
import { checkTopupPurchase, TOPUP_ERRORS, TOPUP_INTEGRATION_ID, topupSessionParams } from "./params";

const pack = { id: "topup_500", name: "500 credits", credits: 500, priceCents: 5000, stripePriceId: "price_500" };
const input = { agencyId: "agency-1", pack, customerId: null, email: "owner@example.test", returnUrl: "https://app.test/settings/credits?session_id={CHECKOUT_SESSION_ID}" };
const allowed = { allowed: true, reason: "" };

describe("topupSessionParams", () => {
  it("is a one-time payment on the Payment Element with the webhook's top-up metadata", () => {
    const params = topupSessionParams(input);
    const metadata = { agency_id: "agency-1", kind: "topup", topup_pack_id: "topup_500" };
    expect(params).toMatchObject({
      mode: "payment",
      ui_mode: "elements",
      integration_identifier: TOPUP_INTEGRATION_ID,
      client_reference_id: "agency-1",
      metadata,
      payment_intent_data: { metadata },
      line_items: [{ price: "price_500", quantity: 1 }],
      adaptive_pricing: { enabled: false },
      customer_creation: "always",
      customer_email: "owner@example.test",
      return_url: input.returnUrl,
    });
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params).not.toHaveProperty("customer");
    expect(TOPUP_INTEGRATION_ID).toMatch(/_[a-z]{8}$/);
  });

  it("uses the agency's Stripe customer when it has one", () => {
    const params = topupSessionParams({ ...input, customerId: "cus_123" });
    expect(params.customer).toBe("cus_123");
    expect(params).not.toHaveProperty("customer_creation");
    expect(params).not.toHaveProperty("customer_email");
  });
});

describe("checkTopupPurchase", () => {
  it("allows a known pack with a price while the plan or trial is active", () => {
    expect(checkTopupPurchase([pack], "topup_500", allowed)).toEqual({ ok: true, pack });
  });

  it("is blocked when the plan is cancelled, past due or paused, with the entitlement's reason", () => {
    for (const reason of [REASONS.canceled, REASONS.pastDue, REASONS.paused]) {
      expect(checkTopupPurchase([pack], "topup_500", { allowed: false, reason })).toEqual({ ok: false, status: 403, error: reason });
    }
  });

  it("refuses an unknown pack and a pack not yet synced to Stripe", () => {
    expect(checkTopupPurchase([pack], "topup_9", allowed)).toEqual({ ok: false, status: 404, error: TOPUP_ERRORS.unknownPack });
    expect(checkTopupPurchase([{ ...pack, stripePriceId: null }], "topup_500", allowed)).toEqual({
      ok: false,
      status: 503,
      error: TOPUP_ERRORS.unavailable,
    });
  });
});
