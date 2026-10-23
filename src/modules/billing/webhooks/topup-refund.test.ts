import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";
import { adminAdjustCredits, getBalance } from "@/modules/credits";
import * as fx from "./fixtures.test-helpers";
import { cleanUp, grants, harness, ledgerTotal, service, setup } from "./harness.test-helpers";

// M5 (2026-10-16): charge.refunded for a top-up takes back the refunded share of its credits, never more than is
// left, once per refund. On the local database; no Stripe calls.
const admins: string[] = [];
afterAll(async () => {
  await cleanUp();
  for (const id of admins.splice(0)) await service.auth.admin.deleteUser(id);
  await service.from("system_alerts").update({ resolved_at: new Date().toISOString() }).eq("kind", "topup_refund_unrecovered").is("resolved_at", null);
});

/** An active agency that bought 500 credits for $50, paid through payment intent `pi`. */
async function boughtTopup(metadata: Record<string, string> = { credits: "500" }) {
  const a = await setup("active");
  const h = harness();
  const session = fx.checkoutSession({
    mode: "payment",
    customer: a.customer,
    agencyId: a.agencyId,
    metadata: { kind: "topup", topup_pack_id: "topup_500", ...metadata },
  });
  const pi = fx.id("pi");
  h.paymentSessions.set(pi, session);
  expect((await h.deliver(fx.event("checkout.session.completed", session))).status).toBe(200);
  const refund = (refunded: number, refundId = fx.id("re")) =>
    fx.event("charge.refunded", fx.charge({ paymentIntent: pi, amount: 5000, refunded, refundId, customer: a.customer }));
  return { a, h, session, refund };
}

async function spend(agencyId: string, credits: number) {
  const { data } = await service.auth.admin.createUser({ email: `vitest-admin-${randomUUID()}@example.test`, email_confirm: true });
  admins.push(data.user!.id);
  await adminAdjustCredits({ agencyId, delta: -credits, adminUserId: data.user!.id, note: "test spend", requestId: randomUUID() });
}

const refundRows = async (agencyId: string) =>
  (await service.from("credit_transactions").select("delta, kind, source_id").eq("agency_id", agencyId).eq("kind", "refund").throwOnError()).data;

const auditRows = async (agencyId: string) =>
  (
    await service
      .from("admin_audit_log")
      .select("admin_user_id, details")
      .eq("target_type", "agency")
      .eq("target_id", agencyId)
      .eq("action", "stripe.topup_refund")
      .throwOnError()
  ).data;

describe("charge.refunded for a top-up", () => {
  it("takes back all of an unused top-up, with a refund ledger row and an audit row", async () => {
    const { a, h, session, refund } = await boughtTopup();
    expect((await getBalance(a.agencyId)).balance).toBe(500);

    const refundId = fx.id("re");
    expect((await h.deliver(refund(5000, refundId))).body).toMatchObject({ outcome: "handled" });

    expect((await getBalance(a.agencyId)).balance).toBe(0);
    expect(await grants(a.agencyId)).toEqual([{ source: "topup", source_id: session.id, amount: 500, remaining: 0, expires_at: null }]);
    expect(await refundRows(a.agencyId)).toEqual([{ delta: -500, kind: "refund", source_id: refundId }]);
    expect(await ledgerTotal(a.agencyId)).toBe(0);
    const [audit] = await auditRows(a.agencyId);
    expect(audit).toMatchObject({ admin_user_id: null, details: { refund_id: refundId, credits: 500, removed: 500, unrecovered: 0 } });
  });

  it("after some credits were used, removes only what is left and raises an alert for the rest", async () => {
    const { a, h, refund } = await boughtTopup();
    await spend(a.agencyId, 200);

    await h.deliver(refund(5000));

    expect((await getBalance(a.agencyId)).balance).toBe(0);
    expect((await getBalance(a.agencyId)).overdraft).toBe(0);
    expect((await refundRows(a.agencyId)).map((r) => r.delta)).toEqual([-300]);
    expect((await auditRows(a.agencyId))[0].details).toMatchObject({ credits: 500, removed: 300, unrecovered: 200 });
    const { data: alert } = await service
      .from("system_alerts")
      .select("severity, details")
      .eq("kind", "topup_refund_unrecovered")
      .is("resolved_at", null)
      .single()
      .throwOnError();
    expect(alert).toMatchObject({ severity: "warning", details: { agency_id: a.agencyId, unrecovered: 200 } });
  });

  it("removes credits in proportion to a partial refund, and a later refund takes the rest", async () => {
    const { a, h, refund } = await boughtTopup();
    await h.deliver(refund(2000));
    expect((await getBalance(a.agencyId)).balance).toBe(300);

    // Stripe's amount_refunded is the total so far: $20 then $50 in all.
    await h.deliver(refund(5000));
    expect((await getBalance(a.agencyId)).balance).toBe(0);
    expect((await refundRows(a.agencyId)).map((r) => r.delta).sort()).toEqual([-200, -300]);
  });

  it("a replayed or resent refund changes nothing", async () => {
    const { a, h, refund } = await boughtTopup();
    const event = refund(2500);
    for (const res of await h.deliverTwice(event)) expect(res.status).toBe(200);
    // The same refund again in a different event.
    await h.deliver({ ...event, id: fx.id("evt") } as Stripe.Event);
    expect((await getBalance(a.agencyId)).balance).toBe(250);
    expect(await refundRows(a.agencyId)).toHaveLength(1);
    expect(await auditRows(a.agencyId)).toHaveLength(1);
  });

  it("ignores a refund of a charge that is not a top-up", async () => {
    const { a, h } = await boughtTopup();
    // An invoice charge: no Checkout Session took it.
    const invoiceCharge = fx.charge({ paymentIntent: fx.id("pi"), amount: 14900, refunded: 14900, refundId: fx.id("re"), customer: a.customer });
    expect((await h.deliver(fx.event("charge.refunded", invoiceCharge))).status).toBe(200);
    // A subscription Checkout's payment.
    const subPi = fx.id("pi");
    h.paymentSessions.set(subPi, fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId }));
    await h.deliver(fx.event("charge.refunded", fx.charge({ paymentIntent: subPi, amount: 14900, refunded: 14900, customer: a.customer })));

    expect((await getBalance(a.agencyId)).balance).toBe(500);
    expect(await refundRows(a.agencyId)).toEqual([]);
    expect(await auditRows(a.agencyId)).toEqual([]);
  });
});

describe("top-up credits from the session metadata", () => {
  it("grants the credits the session was made with, not the pack's current credits", async () => {
    const { a, session } = await boughtTopup({ credits: "450" });
    expect(await grants(a.agencyId)).toEqual([{ source: "topup", source_id: session.id, amount: 450, remaining: 450, expires_at: null }]);
  });

  it("falls back to the pack for a session made before credits were sent", async () => {
    const { a } = await boughtTopup({});
    expect((await grants(a.agencyId))[0]).toMatchObject({ amount: 500 });
  });

  it("falls back to the pack when the metadata is not a whole number", async () => {
    const { a } = await boughtTopup({ credits: "-5" });
    expect((await grants(a.agencyId))[0]).toMatchObject({ amount: 500 });
  });
});
