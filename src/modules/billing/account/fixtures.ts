import "server-only";
import type Stripe from "stripe";
import { productIdFor } from "../catalog";
import type { PlanChangeStripe } from "../plan-change/client";
import { FakeStripe, type PriceTable } from "../plan-change/fake-stripe";
import type { PlanChangeContext } from "../plan-change/planner";
import { createWebhookStore } from "../webhooks/dal";
import { sendBillingEmail } from "../webhooks/emails";
import { dispatchEvent, type WebhookDeps } from "../webhooks/handlers";
import { loadBillingRows } from "./dal";
import type { PortalClient } from "./access";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES): one in-memory Stripe subscription per agency, seeded from
// the database. After each change the real webhook handlers run on it, so plans and credits still reach the
// database only the way Stripe events bring them.

const DAY = 86_400;
const nowSeconds = () => Math.floor(Date.now() / 1000);

// On globalThis so dev server reloads keep pending changes.
const store: Map<string, FakeStripe> = ((globalThis as { __billingFixtures?: Map<string, FakeStripe> }).__billingFixtures ??=
  new Map());

/** Local databases have no Stripe price IDs, so fixture runs give each plan a stand-in one. */
export function withFixturePrices(context: PlanChangeContext): PlanChangeContext {
  return { ...context, plans: context.plans.map((p) => ({ ...p, stripePriceId: p.stripePriceId ?? `price_fixture_${p.id}` })) };
}

const STRIPE_STATUS: Record<string, Stripe.Subscription.Status> = { trialing: "trialing", past_due: "past_due", canceled: "canceled" };

async function seed(context: PlanChangeContext, subscriptionId: string): Promise<FakeStripe> {
  const rows = await loadBillingRows(context.agencyId);
  const prices: PriceTable = {};
  for (const p of context.plans) prices[p.stripePriceId!] = { product: productIdFor({ kind: "plan", id: p.id }), unitAmount: p.priceCents };
  const priceOf = (planId: string) => context.plans.find((p) => p.id === planId)?.stripePriceId;

  const status = STRIPE_STATUS[rows.agency.status] ?? "active";
  const endIso = status === "trialing" ? rows.agency.trialEndsAt : rows.agency.periodEndsAt;
  const now = nowSeconds();
  const periodEnd = endIso ? Math.floor(Date.parse(endIso) / 1000) : now + 30 * DAY;
  return new FakeStripe({
    now,
    status,
    periodStart: periodEnd - 30 * DAY,
    periodEnd,
    prices,
    ids: { subscription: subscriptionId, customer: rows.agency.customerId ?? `cus_fixture_${context.agencyId}`, agency: context.agencyId },
    items: rows.businesses.flatMap((b) => {
      const price = b.planId ? priceOf(b.planId) : undefined;
      return price ? [{ businessId: b.id, price, itemId: b.itemId ?? undefined }] : [];
    }),
  });
}

function webhookDeps(fake: FakeStripe): WebhookDeps {
  return {
    store: createWebhookStore(),
    stripe: {
      retrieveSubscription: async () => fake.subscription(),
      listSubscriptionItems: async () => fake.subscription().items.data,
      listInvoiceLines: async (id) => fake.invoices.find((i) => i.id === id)?.lines.data ?? [],
    },
    sendEmail: sendBillingEmail,
    now: () => new Date(),
  };
}

/** What Stripe would send after a change: the subscription update, then each new paid invoice. */
async function sendEvents(fake: FakeStripe, invoicesBefore: number) {
  const deps = webhookDeps(fake);
  const sub = fake.subscription();
  await dispatchEvent(deps, { id: `evt_fixture_${Date.now()}`, type: "customer.subscription.updated", data: { object: sub } } as Stripe.Event);
  for (const invoice of fake.invoices.slice(invoicesBefore)) {
    if (invoice.status !== "paid") continue;
    await dispatchEvent(deps, { id: `evt_fixture_${invoice.id}`, type: "invoice.paid", data: { object: invoice } } as Stripe.Event);
  }
}

export async function fixturePlanChangeStripe(context: PlanChangeContext): Promise<PlanChangeStripe> {
  const key = context.subscriptionId ?? `none_${context.agencyId}`;
  let fake = store.get(key);
  if (!fake) {
    fake = await seed(context, key);
    store.set(key, fake);
  }
  const f = fake;
  const tick = () => {
    f.clock = Math.max(f.clock, nowSeconds());
  };
  const change = async <T>(run: () => Promise<T>) => {
    tick();
    const before = f.invoices.length;
    const result = await run();
    await sendEvents(f, before);
    return result;
  };
  return {
    retrieveSubscription: async () => (tick(), f.retrieveSubscription()),
    retrieveSchedule: async () => (tick(), f.retrieveSchedule()),
    previewInvoice: async (params) => (tick(), f.previewInvoice(params)),
    createScheduleFromSubscription: (id, key) => change(() => f.createScheduleFromSubscription(id, key)),
    updateSchedule: (id, params, key) => change(() => f.updateSchedule(id, params, key)),
    releaseSchedule: (id, key) => change(() => f.releaseSchedule(id, key)),
    updateSubscription: (id, params, key) => change(() => f.updateSubscription(id, params, key)),
  };
}

export const fixturePortal: PortalClient = {
  mode: "fixture",
  async createSession(_customer, returnUrl) {
    return `${returnUrl}?portal=fixture`;
  },
};
