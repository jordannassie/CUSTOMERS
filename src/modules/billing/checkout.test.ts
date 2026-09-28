import { afterEach, describe, expect, it, vi } from "vitest";
import { TRIAL_INTEGRATION_ID, trialEndDate, trialSessionParams } from "./checkout";
import type { CheckoutClient } from "./checkout-client";
import type { PlanPrice } from "./dal";

// B-41: the Checkout Session the card step asks Stripe for, checked without any Stripe call.

const input = {
  agencyId: "11111111-1111-4111-8111-111111111111",
  businessId: "22222222-2222-4222-8222-222222222222",
  priceId: "price_starter",
  email: "owner@example.test",
  returnUrl: "https://app.example.test/onboarding/card?session_id={CHECKOUT_SESSION_ID}",
};

describe("trialSessionParams", () => {
  const params = trialSessionParams(input);

  it("is a Payment Element session for a 7-day trial subscription", () => {
    expect(params).toMatchObject({
      mode: "subscription",
      ui_mode: "elements",
      subscription_data: { trial_period_days: 7, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } },
      payment_method_collection: "always",
      billing_address_collection: "required",
      customer_email: input.email,
      return_url: input.returnUrl,
    });
  });

  it("never picks payment methods, and stays in USD", () => {
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params.adaptive_pricing).toEqual({ enabled: false });
    expect(params).not.toHaveProperty("currency_options");
  });

  it("is tagged with an integration identifier ending in 8 letters", () => {
    expect(params.integration_identifier).toBe(TRIAL_INTEGRATION_ID);
    expect(TRIAL_INTEGRATION_ID).toMatch(/_[a-z]{8}$/);
  });

  it("carries the webhook's metadata contract (billing README)", () => {
    expect(params.metadata?.agency_id).toBe(input.agencyId);
    expect(params.client_reference_id).toBe(input.agencyId);
    expect(params.subscription_data?.metadata?.agency_id).toBe(input.agencyId);
    expect(params.line_items).toEqual([{ price: "price_starter", quantity: 1, metadata: { business_id: input.businessId } }]);
  });

  it("lets the user type an email when the account has none", () => {
    expect(trialSessionParams({ ...input, email: null })).not.toHaveProperty("customer_email");
  });
});

describe("trialEndDate", () => {
  it("is exactly 7 days after now", () => {
    expect(trialEndDate(new Date("2026-09-28T20:00:00Z")).toISOString()).toBe("2026-10-05T20:00:00.000Z");
  });
});

describe("createTrialCheckout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const starter: PlanPrice = {
    id: "starter",
    name: "Starter",
    priceCents: 14900,
    monthlyCredits: 1200,
    maxCompetitors: 5,
    maxQuestions: 25,
    stripePriceId: "price_starter",
  };
  const request = { agencyId: input.agencyId, businessId: input.businessId, email: input.email, returnUrl: input.returnUrl, planId: "starter" };

  function recordingClient() {
    const calls: unknown[] = [];
    const client: CheckoutClient = {
      async createSession(params) {
        calls.push(params);
        return { id: "cs_test_1", clientSecret: "cs_test_1_secret" };
      },
    };
    return { client, calls };
  }

  it("creates one session at the plan's price and returns only the client secret", async () => {
    const { createTrialCheckout } = await import("./trial");
    const { client, calls } = recordingClient();
    const result = await createTrialCheckout(request, client, async () => starter);
    expect(result).toEqual({ ok: true, clientSecret: "cs_test_1_secret" });
    expect(calls).toEqual([trialSessionParams({ ...input, priceId: "price_starter" })]);
  });

  it("refuses an unknown plan and a plan with no Stripe price, without calling Stripe", async () => {
    const { createTrialCheckout } = await import("./trial");
    const { client, calls } = recordingClient();
    expect(await createTrialCheckout(request, client, async () => null)).toMatchObject({ ok: false, status: 400 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createTrialCheckout(request, client, async () => ({ ...starter, stripePriceId: null }))).toMatchObject({ ok: false, status: 503 });
    expect(calls).toHaveLength(0);
  });

  it("says card sign up is unavailable when Stripe is not set up", async () => {
    const { createTrialCheckout } = await import("./trial");
    expect(await createTrialCheckout(request, null, async () => starter)).toMatchObject({ ok: false, status: 503 });
  });

  it("uses the fake client in fixture mode, and never in production", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_FIXTURES", "true");
    const dev = await import("./checkout-client");
    expect(dev.checkoutFixtures()).toBe(true);
    expect(await dev.liveCheckoutClient()?.createSession(trialSessionParams(input))).toMatchObject({ clientSecret: dev.FIXTURE_CLIENT_SECRET });

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const prod = await import("./checkout-client");
    expect(prod.checkoutFixtures()).toBe(false);
  });
});
