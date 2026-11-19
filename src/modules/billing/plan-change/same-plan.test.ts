import { describe, expect, it } from "vitest";
import { buildBillingView } from "../account/summary";
import { samePlanPrice } from "../plan-price";
import { changesDroppedByCancel } from "./cancel-schedule";
import { pendingFor } from "./pending";
import { previewPlanChange } from "./service";
import { A, B, C, RENEWAL, setup } from "./scenario.test-helpers";

// 2026-10-15: American Standard showed "Starter · Moves to Starter on October 22, 2026" with "Keep Starter". It was
// added while another business's removal was scheduled, so Stripe made a price from the same price_data for each phase.

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

const phaseItem = (id: string, product: string, businessId: string) => ({ price: { id, product }, metadata: { business_id: businessId } });

describe("a business added or upgraded while a change is scheduled", () => {
  it("is on one price in both phases, so nothing shows as scheduled for it", async () => {
    const s = setup({ status: "trialing" });
    await s.change({ kind: "remove", businessId: B });
    await s.change({ kind: "add", businessId: C, planId: "starter" });

    const [now, next] = s.stripe.schedule!.phases;
    const priceOf = (phase: typeof now) => phase.items.find((i) => i.metadata.business_id === C)!.price;
    expect(priceOf(next)).toBe(priceOf(now));
    expect(pendingFor(s.stripe.scheduleObject(), C)).toBeNull();
    expect(pendingFor(s.stripe.scheduleObject(), B)).toBe("remove");
    expect(s.stripe.calls.filter((c) => c.method === "updateSchedule").at(-1)!.key).toMatch(/:one-price$/);
  });

  it("an upgrade made now keeps another business's removal and shows no change for itself", async () => {
    const s = setup();
    await s.change({ kind: "remove", businessId: B });
    await s.change({ kind: "upgrade", businessId: A, planId: "pro" });
    expect(pendingFor(s.stripe.scheduleObject(), A)).toBeNull();
    expect(pendingFor(s.stripe.scheduleObject(), B)).toBe("remove");
    s.stripe.advanceTo(RENEWAL + 60);
    expect(s.stripe.items.map((i) => i.metadata.business_id)).toEqual([A]);
  });

  it("makes no extra call when nothing else is scheduled", async () => {
    const s = setup();
    await s.change({ kind: "add", businessId: C, planId: "starter" });
    expect(s.stripe.calls.some((c) => c.key?.endsWith(":one-price"))).toBe(false);
  });
});

describe("two prices of the same plan are not a change", () => {
  it("samePlanPrice goes by product, and by price ID only when a product is unknown", () => {
    expect(samePlanPrice({ id: "price_1", product: "cd_plan_starter" }, { id: "price_2", product: "cd_plan_starter" })).toBe(true);
    expect(samePlanPrice({ id: "price_1", product: "cd_plan_starter" }, { id: "price_2", product: "cd_plan_pro" })).toBe(false);
    expect(samePlanPrice("price_1", "price_1")).toBe(true);
    expect(samePlanPrice("price_1", { id: "price_2", product: "cd_plan_starter" })).toBe(false);
  });

  it("a schedule written before the fix shows no change for the business, and cancel lists none for it", async () => {
    const s = setup({ status: "trialing" });
    const old = s.stripe.scheduleObject.bind(s.stripe);
    await s.stripe.createScheduleFromSubscription(s.stripe.subscriptionId, "k");
    const schedule = old();
    schedule.phases = [
      { ...schedule.phases[0], items: [phaseItem("price_a1", "cd_plan_starter", A), phaseItem("price_b1", "cd_plan_starter", B)] as never },
      { ...schedule.phases[0], start_date: RENEWAL, items: [phaseItem("price_a1", "cd_plan_starter", A), phaseItem("price_b2", "cd_plan_starter", B)] as never },
    ];
    expect(pendingFor(schedule, B)).toBeNull();
    expect(changesDroppedByCancel(schedule, s.ctx.plans)).toEqual([]);

    const sub = s.stripe.subscription();
    const view = buildBillingView(
      {
        agency: { status: "trialing", trialEndsAt: iso(RENEWAL), periodEndsAt: iso(RENEWAL), subscriptionId: sub.id, customerId: "cus_fake" },
        plans: [{ id: "starter", name: "Starter", priceCents: 14900, monthlyCredits: 1200 }],
        businesses: [
          { id: A, name: "Acme Plumbing", planId: "starter", itemId: `si_${A}`, deleted: false },
          { id: B, name: "American Standard", planId: "starter", itemId: `si_${B}`, deleted: false },
        ],
      },
      { sub, schedule, upcoming: null },
    );
    expect(view.onPlan.map((b) => b.pending)).toEqual([null, null]);
  });
});

describe("the cancel dialog", () => {
  it("lists no change for a deleted business, and still lists one for a business that stays", async () => {
    const { ctx, deps, change } = setup({ a: "price_pro" });
    await change({ kind: "remove", businessId: B });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    ctx.businesses.find((b) => b.id === B)!.deleted = true;
    const preview = await previewPlanChange(ctx, { kind: "cancel" }, deps);
    expect(JSON.stringify(preview)).not.toContain("Bay Dental");
    expect(JSON.stringify(preview)).toContain("Your change to Starter for Acme Plumbing is also canceled.");
  });
});
