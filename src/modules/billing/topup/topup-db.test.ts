import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";
import { adminAdjustCredits, expireGrants, getBalance } from "@/modules/credits";
import { canSpendTopUps, canStartScan, REASONS } from "@/modules/entitlements";
import { createWebhookStore } from "../webhooks/dal";
import * as fx from "../webhooks/fixtures.test-helpers";
import { dispatchEvent } from "../webhooks/handlers";
import { cleanUp, grants, harness, service, setup } from "../webhooks/harness.test-helpers";
import { FIXTURE_SESSION_PREFIX, type TopupCheckoutClient } from "./client";
import { listTopupPacks } from "../dal";
import { buyTopUp, completeFixtureTopUp } from "./service";

// B-43 against the local database: the webhook grants a paid top-up; no Stripe calls anywhere.
const admins: string[] = [];
afterAll(async () => {
  await cleanUp();
  for (const id of admins.splice(0)) await service.auth.admin.deleteUser(id);
});

const paidTopup = (a: { agencyId: string; customer: string }, packId = "topup_500") =>
  fx.checkoutSession({ mode: "payment", customer: a.customer, agencyId: a.agencyId, metadata: { kind: "topup", topup_pack_id: packId } });

async function overdraw(agencyId: string, credits: number) {
  const { data } = await service.auth.admin.createUser({ email: `vitest-admin-${randomUUID()}@example.test`, email_confirm: true });
  admins.push(data.user!.id);
  await adminAdjustCredits({ agencyId, delta: -credits, adminUserId: data.user!.id, note: "test overdraft", requestId: randomUUID() });
}

describe("top-up grant", () => {
  it("pays back a negative balance first, then adds the rest, once", async () => {
    const a = await setup("active");
    await overdraw(a.agencyId, 40);
    expect(await getBalance(a.agencyId)).toMatchObject({ balance: -40, overdraft: 40 });

    const session = paidTopup(a);
    await harness().deliverTwice(fx.event("checkout.session.completed", session));

    expect(await getBalance(a.agencyId)).toMatchObject({ balance: 460, overdraft: 0, topup_remaining: 460 });
    expect(await grants(a.agencyId)).toEqual([{ source: "topup", source_id: session.id, amount: 500, remaining: 460, expires_at: null }]);
  });

  it("never expires, while a plan grant past its end does", async () => {
    const a = await setup("active");
    await harness().deliver(fx.event("checkout.session.completed", paidTopup(a, "topup_2000")));
    const planSource = `in_line_${randomUUID()}`;
    await service.rpc("grant_credits", {
      p_agency_id: a.agencyId,
      p_source: "plan",
      p_source_id: planSource,
      p_amount: 100,
      p_expires_at: new Date(Date.now() + 60_000).toISOString(),
    }).throwOnError();
    // Only the test moves a plan grant's end into the past; the top-up has no end to move.
    await service.from("credit_grants").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("source_id", planSource).throwOnError();

    await expireGrants();

    const rows = await grants(a.agencyId);
    expect(rows.find((g) => g.source === "topup")).toMatchObject({ amount: 2000, remaining: 2000, expires_at: null });
    expect(rows.find((g) => g.source === "plan")).toMatchObject({ remaining: 0 });
    expect((await getBalance(a.agencyId)).balance).toBe(2000);
  });
});

describe("cancelled plan", () => {
  it("keeps the top-up credits but blocks spending them and buying more", async () => {
    const a = await setup("active");
    await harness().deliver(fx.event("checkout.session.completed", paidTopup(a)));
    await service.from("agencies").update({ status: "canceled" }).eq("id", a.agencyId).throwOnError();

    expect((await getBalance(a.agencyId)).balance).toBe(500);
    expect(await canSpendTopUps(a.agencyId)).toEqual({ allowed: false, reason: REASONS.canceled });
    expect(await canStartScan(a.agencyId, a.businesses[0])).toEqual({ allowed: false, reason: REASONS.canceled });

    const created: unknown[] = [];
    const client: TopupCheckoutClient = { mode: "stripe", createSession: async (p) => (created.push(p), { id: "cs_x", clientSecret: "x" }) };
    const result = await buyTopUp(
      { client, loadPacks: listTopupPacks, canSpendTopUps, customerId: async () => a.customer },
      { agencyId: a.agencyId, email: null, packId: "topup_500", returnUrl: "https://app.test/r" },
    );
    expect(result).toEqual({ ok: false, status: 403, error: REASONS.canceled });
    expect(created).toEqual([]);
  });
});

describe("fixture payment (dev and Playwright)", () => {
  it("grants through the real webhook handler, keyed by the session ID", async () => {
    const a = await setup("trialing");
    const deps = {
      store: createWebhookStore(service),
      stripe: { retrieveSubscription: async () => ({}) as Stripe.Subscription, listSubscriptionItems: async () => [], listInvoiceLines: async () => [] },
      sendEmail: async () => ({ status: "sent" as const, providerId: "fake" }),
      now: () => new Date(),
    };
    const dispatch = (object: Stripe.Checkout.Session) =>
      dispatchEvent(deps, { id: `evt_${object.id}`, type: "checkout.session.completed", data: { object } } as Stripe.Event);
    const sessionId = `${FIXTURE_SESSION_PREFIX}${randomUUID()}`;

    await completeFixtureTopUp({ fixtures: true, dispatch }, { agencyId: a.agencyId, sessionId, packId: "topup_500" });
    await completeFixtureTopUp({ fixtures: true, dispatch }, { agencyId: a.agencyId, sessionId, packId: "topup_500" });

    expect(await grants(a.agencyId)).toEqual([{ source: "topup", source_id: sessionId, amount: 500, remaining: 500, expires_at: null }]);
  });
});
