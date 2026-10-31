import { afterAll, describe, expect, it, vi } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { agencyRow, businessRows, cleanUp, harness, setup } from "./harness.test-helpers";

// Events for a subscription other than the agency's saved one (a duplicate checkout, BUG-118) change nothing, while a
// new subscription still links when the agency has none yet or its saved one has ended.

const DAY = fx.DAY;
afterAll(cleanUp);
vi.spyOn(console, "warn").mockImplementation(() => {});

type Agency = Awaited<ReturnType<typeof setup>>;

function activeSubscription(a: Agency, h: ReturnType<typeof harness>) {
  const periodEnd = fx.nowSeconds() + 20 * DAY;
  const sub = fx.subscription({
    customer: a.customer,
    agencyId: a.agencyId,
    status: "active",
    items: a.businesses.map((businessId) => ({ product: "cd_plan_starter", businessId, periodEnd })),
  });
  h.subscriptions.set(sub.id, sub);
  return sub;
}

const statuses = async (agencyId: string) => (await businessRows(agencyId)).map((r) => r.status);

describe("a duplicate subscription", () => {
  it("is ignored when it starts and when it is deleted, so the paying agency stays active", async () => {
    const a = await setup("active");
    const h = harness();
    const paying = activeSubscription(a, h);
    await h.deliver(fx.event("checkout.session.completed", fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: paying.id })));
    await h.deliver(fx.event("customer.subscription.created", paying));

    const duplicate = activeSubscription(a, h);
    await h.deliver(fx.event("checkout.session.completed", fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: duplicate.id })));
    await h.deliver(fx.event("customer.subscription.created", duplicate));
    h.subscriptions.set(duplicate.id, { ...duplicate, status: "canceled" });
    for (const res of await h.deliverTwice(fx.event("customer.subscription.deleted", { ...duplicate, status: "canceled" }))) expect(res.status).toBe(200);

    expect(await agencyRow(a.agencyId)).toMatchObject({ status: "active", stripe_subscription_id: paying.id });
    expect(await statuses(a.agencyId)).toEqual(["active", "active"]);
    expect((await businessRows(a.agencyId)).map((r) => r.stripe_subscription_item_id).sort()).toEqual(paying.items.data.map((i) => i.id).sort());
  });

  it("links a subscription.created that arrives before checkout.session.completed", async () => {
    const a = await setup("trialing");
    const h = harness();
    const sub = activeSubscription(a, h);
    await h.deliver(fx.event("customer.subscription.created", sub));
    await h.deliver(fx.event("checkout.session.completed", fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: sub.id })));
    expect(await agencyRow(a.agencyId)).toMatchObject({ status: "active", stripe_subscription_id: sub.id });
  });
});

describe("a plan started again after a cancel", () => {
  it("links the new subscription and its businesses", async () => {
    const a = await setup("active");
    const h = harness();
    const old = activeSubscription(a, h);
    await h.deliver(fx.event("customer.subscription.created", old));
    h.subscriptions.set(old.id, { ...old, status: "canceled" });
    await h.deliver(fx.event("customer.subscription.deleted", { ...old, status: "canceled" }));
    expect(await agencyRow(a.agencyId)).toMatchObject({ status: "canceled", stripe_subscription_id: old.id });
    expect(await statuses(a.agencyId)).toEqual(["canceled", "canceled"]);

    const restart = activeSubscription(a, h);
    await h.deliver(fx.event("checkout.session.completed", fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: restart.id })));
    expect(await agencyRow(a.agencyId)).toMatchObject({ status: "active", stripe_subscription_id: restart.id });
    expect(await statuses(a.agencyId)).toEqual(["active", "active"]);

    // A late event for the old subscription no longer changes the agency.
    await h.deliver(fx.event("customer.subscription.updated", { ...old, status: "canceled" }));
    expect(await agencyRow(a.agencyId)).toMatchObject({ status: "active", stripe_subscription_id: restart.id });
  });
});
