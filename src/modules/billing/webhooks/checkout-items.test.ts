import { afterAll, describe, expect, it } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { businessRows, cleanUp, harness, setup } from "./harness.test-helpers";

// BUG-104: Checkout keeps line item metadata off the subscription items, so the webhook finds each item's business
// on the session's line items (by price) and saves it, whichever of the two events comes first.
const DAY = fx.DAY;

afterAll(cleanUp);

async function started() {
  const a = await setup();
  const h = harness();
  const trialEnd = fx.nowSeconds() + 7 * DAY;
  const sub = fx.subscription({
    customer: a.customer,
    agencyId: a.agencyId,
    status: "trialing",
    trialEnd,
    // Two businesses on Starter, as Choose plan starts them: no business_id on either item.
    items: [
      { product: "cd_plan_starter", periodEnd: trialEnd },
      { product: "cd_plan_starter", periodEnd: trialEnd },
    ],
  });
  h.subscriptions.set(sub.id, sub);
  const [first, second] = sub.items.data;
  const session = fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: sub.id });
  return { a, h, sub, first, second, session };
}

const expected = (a: { businesses: string[] }, first: { id: string }, second: { id: string }) =>
  [
    { business_id: a.businesses[0], plan_id: "starter", status: "trialing", stripe_subscription_item_id: first.id },
    { business_id: a.businesses[1], plan_id: "starter", status: "trialing", stripe_subscription_item_id: second.id },
  ].sort((x, y) => x.business_id.localeCompare(y.business_id));

describe("items started in Checkout", () => {
  it("saves each business from the session's line items and writes business_id onto its item", async () => {
    const { a, h, sub, first, second, session } = await started();
    h.checkoutLines.set(sub.id, new Map([[first.price.id, a.businesses[0]], [second.price.id, a.businesses[1]]]));

    for (const res of await h.deliverTwice(fx.event("checkout.session.completed", session))) expect(res.status).toBe(200);

    const rows = (await businessRows(a.agencyId)).sort((x, y) => x.business_id.localeCompare(y.business_id));
    expect(rows).toEqual(expected(a, first, second));
    expect(h.tagged).toEqual([[first.id, a.businesses[0]], [second.id, a.businesses[1]]]);
  });

  it("saves them once the session completes when the subscription event came first", async () => {
    const { a, h, sub, first, second, session } = await started();
    // Before the session is complete Stripe can't find it by subscription yet.
    await h.deliver(fx.event("customer.subscription.created", sub));
    expect(await businessRows(a.agencyId)).toEqual([]);

    h.checkoutLines.set(sub.id, new Map([[first.price.id, a.businesses[0]], [second.price.id, a.businesses[1]]]));
    await h.deliver(fx.event("checkout.session.completed", session));
    const rows = (await businessRows(a.agencyId)).sort((x, y) => x.business_id.localeCompare(y.business_id));
    expect(rows).toEqual(expected(a, first, second));
  });

  it("never links another agency's business named on a line item", async () => {
    const { a, h, sub, first, second, session } = await started();
    const other = await setup();
    h.checkoutLines.set(sub.id, new Map([[first.price.id, other.businesses[0]], [second.price.id, a.businesses[1]]]));
    await h.deliver(fx.event("checkout.session.completed", session));
    expect((await businessRows(a.agencyId)).map((r) => r.business_id)).toEqual([a.businesses[1]]);
    expect(await businessRows(other.agencyId)).toEqual([]);
  });

  it("links the one item left to the one checkout business left, when its plan changed since checkout (BUG-121)", async () => {
    const { a, h, sub, first, second, session } = await started();
    // Only the first item's price is on the session: the second business changed plan, so its price is new.
    h.checkoutLines.set(sub.id, new Map([[first.price.id, a.businesses[0]], ["price_at_checkout", a.businesses[1]]]));
    await h.deliver(fx.event("checkout.session.completed", session));
    const rows = (await businessRows(a.agencyId)).sort((x, y) => x.business_id.localeCompare(y.business_id));
    expect(rows).toEqual(expected(a, first, second));
  });
});
