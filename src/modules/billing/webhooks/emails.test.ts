import type Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";
import { sendEmail, type EmailClient } from "@/modules/email";
import { trialChargeCents } from "./emails";
import * as fx from "./fixtures.test-helpers";
import { cleanUp, harness, service, setup } from "./harness.test-helpers";

// B-62: trial ending and payment failed, from a Stripe event to email_log, sent once however often Stripe repeats
// the event. A fake mail client stands in for Resend, so nothing is ever sent.
afterAll(cleanUp);

const DAY = fx.DAY;
const settings = { from: "Customers.Direct <hello@mail.example>", baseUrl: "https://app.example", unsubscribeSecret: null };

function fakeSender() {
  const sent: { subject: string; html: string; text: string }[] = [];
  const client: EmailClient = {
    send: async (email) => {
      sent.push(email);
      return { id: `re_${sent.length}` };
    },
  };
  return { sent, send: (input: Parameters<typeof sendEmail>[0]) => sendEmail(input, { client, settings }) };
}

function priced(sub: Stripe.Subscription, cents: number[]): Stripe.Subscription {
  sub.items.data.forEach((item, i) => Object.assign(item.price, { unit_amount: cents[i], currency: "usd" }));
  return sub;
}

async function sentRows(key: string) {
  const { data } = await service.from("email_log").select("type, status").eq("idempotency_key", key).throwOnError();
  return data;
}

describe("trialChargeCents", () => {
  it("adds up every item, and gives up when a price is unknown", () => {
    const sub = fx.subscription({ customer: "cus_x", status: "trialing", items: [{ product: "a", periodEnd: 1 }, { product: "b", periodEnd: 1 }] });
    expect(trialChargeCents(sub)).toBeNull();
    expect(trialChargeCents(priced(sub, [14900, 14900]))).toBe(29800);
  });
});

describe("trial ending", () => {
  it("emails the owner once with the date and amount, however often the event comes", async () => {
    const a = await setup();
    const mail = fakeSender();
    const h = harness(mail.send);
    const trialEnd = Date.UTC(2026, 9, 2, 12) / 1000;
    const sub = priced(
      fx.subscription({
        customer: a.customer,
        agencyId: a.agencyId,
        status: "trialing",
        trialEnd,
        items: a.businesses.map((businessId) => ({ product: "cd_plan_starter", businessId, periodEnd: trialEnd })),
      }),
      [14900, 14900],
    );

    await h.deliverTwice(fx.event("customer.subscription.trial_will_end", sub));
    // A new event for the same trial (not a retry of the first) still sends nothing.
    await h.deliver(fx.event("customer.subscription.trial_will_end", sub));

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].subject).toBe("Your free trial ends on October 2");
    expect(mail.sent[0].text).toContain("On October 2 we'll charge $298 to your card");
    expect(await sentRows(`trial_ending:${sub.id}:${trialEnd * 1000}`)).toEqual([{ type: "trial_ending", status: "sent" }]);
  });
});

describe("payment failed", () => {
  it("emails the owner once per invoice with a link to fix the card", async () => {
    const a = await setup("active");
    const mail = fakeSender();
    const h = harness(mail.send);
    const subId = fx.id("sub");
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end: fx.nowSeconds() + 30 * DAY })];
    const invoice = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "open" });

    await h.deliverTwice(fx.event("invoice.payment_failed", invoice));
    // Stripe's next retry fails too: a new event for the same invoice.
    await h.deliver(fx.event("invoice.payment_failed", invoice));

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].subject).toBe("Your payment didn't go through");
    expect(mail.sent[0].text).toContain("We couldn't charge your card $149");
    expect(mail.sent[0].html).toContain('href="https://app.example/settings/billing"');
    expect(await sentRows(`payment_failed:${invoice.id}`)).toEqual([{ type: "payment_failed", status: "sent" }]);
  });
});
