import { afterAll, describe, expect, it } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { cleanUp, grants, harness, setup } from "./harness.test-helpers";

// Prorated credits use the item's real billing period from Stripe: a month before February 28 is January 28, but a
// period billed on the 31st started on January 31, so 14 of 28 days are left, not 14 of 31.

afterAll(cleanUp);
const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);

describe("invoice.paid for an upgrade in a January 31 to February 28 period", () => {
  it("grants 1,300 x 14/28 = 650 when upgraded on February 14", async () => {
    const a = await setup("active");
    const h = harness();
    const end = at("2027-02-28T00:00:00Z");
    const sub = fx.subscription({
      customer: a.customer,
      agencyId: a.agencyId,
      status: "active",
      items: [{ product: "cd_plan_pro", businessId: a.businesses[0], periodEnd: end }],
    });
    const item = sub.items.data[0];
    item.current_period_start = at("2027-01-31T00:00:00Z");
    h.subscriptions.set(sub.id, sub);

    const half = { subscriptionId: sub.id, itemId: item.id, proration: true, start: at("2027-02-14T00:00:00Z"), end };
    const lines = [fx.line({ ...half, product: "cd_plan_starter", amount: -7450 }), fx.line({ ...half, product: "cd_plan_pro", amount: 12450 })];
    const upgrade = fx.invoice({ customer: a.customer, subscriptionId: sub.id, agencyId: a.agencyId, billingReason: "subscription_update", lines });
    for (const res of await h.deliverTwice(fx.event("invoice.paid", upgrade))) expect(res.status).toBe(200);

    expect((await grants(a.agencyId)).map((g) => [g.source_id, g.amount])).toEqual([[lines[1].id, 650]]);
  });
});
