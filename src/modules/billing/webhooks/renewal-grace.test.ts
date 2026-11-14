import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { adminAdjustCredits, getBalance, getUsage, grantTrialCredits } from "@/modules/credits";
import { PERIOD_GRACE_MS } from "./credits";
import * as fx from "./fixtures.test-helpers";
import { cleanUp, grants, harness, service, setup } from "./harness.test-helpers";

// M4: trial credits end with the trial only once the plan is paid. M6: plan grants run 6 hours past their period, so
// a late renewal never leaves 0 credits, and the old period ends once the renewal is paid. Local database, no Stripe.
const DAY = fx.DAY;
const HOUR = 3600;
const admins: string[] = [];
afterAll(async () => {
  await cleanUp();
  for (const id of admins.splice(0)) await service.auth.admin.deleteUser(id);
});

async function spend(agencyId: string, credits: number) {
  const { data } = await service.auth.admin.createUser({ email: `vitest-admin-${randomUUID()}@example.test`, email_confirm: true });
  admins.push(data.user!.id);
  await adminAdjustCredits({ agencyId, delta: -credits, adminUserId: data.user!.id, note: "test spend", requestId: randomUUID() });
}

/** A trialing agency linked to `subId`, with 150 trial credits until the planned trial end in 5 days. */
async function trialAgency() {
  const a = await setup("trialing");
  const subId = fx.id("sub");
  await service.from("agencies").update({ stripe_customer_id: a.customer, stripe_subscription_id: subId }).eq("id", a.agencyId).throwOnError();
  await grantTrialCredits({ agencyId: a.agencyId, sourceId: fx.id("il"), amount: 150, expiresAt: new Date(Date.now() + 5 * DAY * 1000) });
  return { a, subId, h: harness() };
}

/** The trial ended early (now - 1 minute): the first month's invoice and the subscription Stripe then has. */
function trialEnded(t: Awaited<ReturnType<typeof trialAgency>>, status: "active" | "past_due", invoiceStatus: "paid" | "open") {
  const { a, subId, h } = t;
  const start = fx.nowSeconds() - 60;
  const invoice = fx.invoice({
    customer: a.customer,
    subscriptionId: subId,
    agencyId: a.agencyId,
    billingReason: "subscription_update",
    status: invoiceStatus,
    lines: [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start, end: start + 30 * DAY })],
  });
  const sub = fx.subscription({
    id: subId,
    customer: a.customer,
    agencyId: a.agencyId,
    status,
    trialEnd: start,
    latestInvoice: invoice.id!,
    items: [{ product: "cd_plan_starter", businessId: a.businesses[0], periodEnd: start + 30 * DAY }],
  });
  h.subscriptions.set(subId, sub);
  h.invoices.set(invoice.id!, invoice);
  return fx.event("customer.subscription.updated", sub);
}

const trialLeft = async (agencyId: string) => (await grants(agencyId)).find((g) => g.source === "trial")!.remaining;

describe("trial credits when the first payment fails (M4)", () => {
  it("are kept while the subscription is past due", async () => {
    const t = await trialAgency();
    expect((await t.h.deliver(trialEnded(t, "past_due", "open"))).status).toBe(200);
    expect(await trialLeft(t.a.agencyId)).toBe(150);
    expect((await getBalance(t.a.agencyId)).balance).toBe(150);
  });

  it("are kept while active with the invoice still unpaid, then replaced by the plan credits once it is paid", async () => {
    const t = await trialAgency();
    await t.h.deliver(trialEnded(t, "active", "open"));
    expect(await trialLeft(t.a.agencyId)).toBe(150);

    // The card went through: Stripe's next subscription update has the paid invoice.
    await t.h.deliver(trialEnded(t, "active", "paid"));
    expect(await trialLeft(t.a.agencyId)).toBe(0);
    expect((await grants(t.a.agencyId)).filter((g) => g.source === "plan").map((g) => g.amount)).toEqual([1200]);
    expect((await getBalance(t.a.agencyId)).balance).toBe(1200);
  });
});

describe("renewal grace (M6)", () => {
  it("keeps last month's credits a few hours past the period end, then ends them when the renewal is paid", async () => {
    const a = await setup("active");
    const h = harness();
    const subId = fx.id("sub");
    const renewal = fx.nowSeconds() - HOUR;
    const paid = (start: number, end: number) =>
      fx.invoice({
        customer: a.customer,
        subscriptionId: subId,
        agencyId: a.agencyId,
        billingReason: "subscription_cycle",
        lines: [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start, end })],
      });

    // Last month's invoice: its period ended an hour ago, and Stripe has not paid the renewal yet.
    await h.deliver(fx.event("invoice.paid", paid(renewal - 30 * DAY, renewal)));
    const [old] = await grants(a.agencyId);
    expect(Date.parse(old.expires_at!)).toBe(renewal * 1000 + PERIOD_GRACE_MS);
    await spend(a.agencyId, 200);
    expect((await getBalance(a.agencyId)).balance).toBe(1000);

    // The renewal is paid: this month's 1,200, and last month's 1,000 left are gone, not added on top.
    await h.deliver(fx.event("invoice.paid", paid(renewal, renewal + 30 * DAY)));
    const rows = await grants(a.agencyId);
    expect(rows.map((g) => g.remaining)).toEqual([0, 1200]);
    expect(Date.parse(rows[0].expires_at!)).toBeLessThanOrEqual(Date.now());
    expect((await getBalance(a.agencyId)).balance).toBe(1200);
    expect(await getUsage(a.agencyId)).toMatchObject({ balance: 1200, periodCredits: 1200, periodUsed: 0 });
    const { data: expiries } = await service.from("credit_transactions").select("delta").eq("agency_id", a.agencyId).eq("kind", "expire").throwOnError();
    expect(expiries).toEqual([{ delta: -1000 }]);

    // The low credits email names the renewal date, not the grant's end 6 hours later.
    const periodEnd = new Date((renewal + 30 * DAY) * 1000).toISOString();
    await service.from("agencies").update({ current_period_end: periodEnd }).eq("id", a.agencyId).throwOnError();
    await spend(a.agencyId, 1000);
    const { data: low } = await service.rpc("low_credit_agencies").throwOnError();
    const mine = low.find((r) => r.agency_id === a.agencyId);
    expect(mine).toMatchObject({ level: "low", total: 1200, balance: 200 });
    expect(Date.parse(mine!.period_end!)).toBe(Date.parse(periodEnd));
  });

  it("never ends this period's grants when an old invoice is replayed", async () => {
    const a = await setup("active");
    const h = harness();
    const subId = fx.id("sub");
    const start = fx.nowSeconds() - DAY;
    const line = fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start, end: start + 30 * DAY });
    const invoice = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines: [line] });
    await h.deliver(fx.event("invoice.paid", invoice));
    await h.deliver(fx.event("invoice.paid", invoice));
    expect((await grants(a.agencyId)).map((g) => g.remaining)).toEqual([1200]);
  });
});
