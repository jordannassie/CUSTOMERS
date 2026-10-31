import type Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";
import { getBalance } from "@/modules/credits";
import { canStartScan } from "@/modules/entitlements";
import { dispatchEvent } from "./handlers";
import * as fx from "./fixtures.test-helpers";
import { cleanUp, grants, harness, service, setup } from "./harness.test-helpers";

// A1: invoice.paid never came (no `stripe listen`), and the card step linked the checkout itself. The trial credits
// come with the link, so the first scan starts; the late invoice.paid grants nothing more.
const DAY = fx.DAY;

afterAll(cleanUp);

async function trialStarted(invoiceStatus: "paid" | "open" = "paid") {
  const a = await setup();
  const h = harness();
  const trialEnd = fx.nowSeconds() + 7 * DAY;
  const subId = fx.id("sub");
  const first = fx.invoice({
    customer: a.customer,
    subscriptionId: subId,
    agencyId: a.agencyId,
    billingReason: "subscription_create",
    status: invoiceStatus,
    lines: [fx.line({ product: "cd_plan_starter", amount: 0, subscriptionId: subId, start: fx.nowSeconds(), end: trialEnd })],
  });
  const sub = fx.subscription({
    id: subId,
    customer: a.customer,
    agencyId: a.agencyId,
    status: "trialing",
    trialEnd,
    latestInvoice: first.id!,
    items: [{ product: "cd_plan_starter", businessId: a.businesses[0], periodEnd: trialEnd }],
  });
  h.subscriptions.set(sub.id, sub);
  h.invoices.set(first.id!, first);
  const session = fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: sub.id });
  // What the card step's recovery runs (applyCompletedCheckout): the webhook's handler, with no webhook event.
  await dispatchEvent(h.deps, { id: `recovered_${session.id}`, type: "checkout.session.completed", data: { object: session } } as Stripe.Event);
  return { a, h, first };
}

describe("checkout linked without invoice.paid", () => {
  it("grants the 150 trial credits (D-17), so the first scan can be queued", async () => {
    const { a } = await trialStarted();
    expect((await getBalance(a.agencyId)).balance).toBe(150);
    expect(await canStartScan(a.agencyId, a.businesses[0])).toEqual({ allowed: true, reason: "" });
    // What Run scan inserts once the check above passes (jobs insertManualJob).
    const { data: job } = await service
      .from("scan_jobs")
      .insert({ agency_id: a.agencyId, business_id: a.businesses[0], priority: 100 })
      .select("status")
      .single()
      .throwOnError();
    expect(job.status).toBe("queued");
  });

  it("grants nothing more when the late invoice.paid arrives", async () => {
    const { a, h, first } = await trialStarted();
    for (const res of await h.deliverTwice(fx.event("invoice.paid", first))) expect(res.status).toBe(200);
    expect((await getBalance(a.agencyId)).balance).toBe(150);
    expect(await grants(a.agencyId)).toHaveLength(1);
  });

  it("waits for the payment when the first invoice isn't paid yet", async () => {
    const { a } = await trialStarted("open");
    expect(await grants(a.agencyId)).toEqual([]);
  });
});
