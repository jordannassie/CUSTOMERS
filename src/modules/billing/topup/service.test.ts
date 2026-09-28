import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { REASONS } from "@/modules/entitlements";
import { FIXTURE_SESSION_PREFIX, type TopupCheckoutClient } from "./client";
import { TOPUP_ERRORS } from "./params";
import { buyTopUp, completeFixtureTopUp, getTopupOffer, type BuyTopUpDeps } from "./service";

// No Stripe calls: the Checkout client is a fake that records what it was asked to create.

const packs = [
  { id: "topup_500", name: "500 credits", credits: 500, priceCents: 5000, stripePriceId: "price_500" },
  { id: "topup_2000", name: "2,000 credits", credits: 2000, priceCents: 18000, stripePriceId: null },
];
const input = { agencyId: "agency-1", email: "owner@example.test", packId: "topup_500", returnUrl: "https://app.test/r" };

function fakeClient(mode: TopupCheckoutClient["mode"] = "stripe") {
  const created: Stripe.Checkout.SessionCreateParams[] = [];
  const client: TopupCheckoutClient = {
    mode,
    createSession: async (params) => {
      created.push(params);
      return { id: "cs_test_1", clientSecret: "cs_test_1_secret" };
    },
  };
  return { client, created };
}

function deps(overrides: Partial<BuyTopUpDeps> = {}): BuyTopUpDeps {
  return {
    client: fakeClient().client,
    loadPacks: async () => packs,
    canSpendTopUps: async () => ({ allowed: true, reason: "" }),
    customerId: async () => "cus_1",
    ...overrides,
  };
}

describe("buyTopUp", () => {
  it("creates one session for the pack's Stripe price on the agency's customer", async () => {
    const { client, created } = fakeClient();
    expect(await buyTopUp(deps({ client }), input)).toEqual({ ok: true, data: { sessionId: "cs_test_1", clientSecret: "cs_test_1_secret" } });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ customer: "cus_1", line_items: [{ price: "price_500" }], metadata: { topup_pack_id: "topup_500" } });
  });

  it("is blocked when the plan is cancelled, and never reaches Stripe", async () => {
    const { client, created } = fakeClient();
    const canceled = { allowed: false, reason: REASONS.canceled };
    expect(await buyTopUp(deps({ client, canSpendTopUps: async () => canceled }), input)).toEqual({
      ok: false,
      status: 403,
      error: REASONS.canceled,
    });
    expect(created).toEqual([]);
  });

  it("says buying is unavailable with no Stripe keys or a pack not synced to Stripe", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await buyTopUp(deps({ client: null }), input)).toMatchObject({ ok: false, error: TOPUP_ERRORS.unavailable });
    expect(await buyTopUp(deps(), { ...input, packId: "topup_2000" })).toMatchObject({ ok: false, status: 503 });
    error.mockRestore();
  });

  it("uses a placeholder price in fixture mode, before the catalog sync", async () => {
    const { client, created } = fakeClient("fixture");
    expect(await buyTopUp(deps({ client }), { ...input, packId: "topup_2000" })).toMatchObject({ ok: true });
    expect(created[0].line_items).toEqual([{ price: "price_fixture_topup_2000", quantity: 1 }]);
  });
});

describe("getTopupOffer", () => {
  it("lists the packs without Stripe IDs and names the form to show", async () => {
    const offer = await getTopupOffer(fakeClient("fixture").client, async () => packs);
    expect(offer).toEqual({
      mode: "fixture",
      publishableKey: null,
      packs: packs.map(({ id, name, credits, priceCents }) => ({ id, name, credits, priceCents })),
    });
    expect((await getTopupOffer(null, async () => packs)).mode).toBe("off");
  });
});

describe("completeFixtureTopUp", () => {
  const sessionId = `${FIXTURE_SESSION_PREFIX}abc`;

  it("hands the webhook handler a paid top-up session", async () => {
    const dispatch = vi.fn(async () => undefined);
    expect(await completeFixtureTopUp({ fixtures: true, dispatch }, { agencyId: "agency-1", sessionId, packId: "topup_500" })).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sessionId,
        mode: "payment",
        payment_status: "paid",
        metadata: { agency_id: "agency-1", kind: "topup", topup_pack_id: "topup_500" },
      }),
    );
  });

  it("does nothing outside fixture mode or for a real session ID", async () => {
    const dispatch = vi.fn(async () => undefined);
    expect(await completeFixtureTopUp({ fixtures: false, dispatch }, { agencyId: "a", sessionId, packId: "topup_500" })).toBe(false);
    expect(await completeFixtureTopUp({ fixtures: true, dispatch }, { agencyId: "a", sessionId: "cs_live_1", packId: "topup_500" })).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
