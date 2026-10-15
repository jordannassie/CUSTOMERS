import { describe, expect, it } from "vitest";
import { pendingFor } from "./pending";
import type { PlanChange } from "./planner";
import { A, B, creditsOf, planOf, RENEWAL, setup } from "./scenario.test-helpers";
import { applyPlanChange, previewPlanChange } from "./service";

// An upgrade made now while another business's downgrade is pending. A schedule update can't refuse a declined card
// (Stripe applies it and leaves the invoice open), so the change goes on the subscription with error_if_incomplete.

const upgradeB: PlanChange = { kind: "upgrade", businessId: B, planId: "pro" };

async function withPendingDowngrade() {
  const s = setup({ a: "price_pro" });
  await s.change({ kind: "downgrade", businessId: A, planId: "starter" });
  expect(pendingFor(s.stripe.scheduleObject(), A)).toBe("plan");
  return s;
}

describe("an upgrade made now with a downgrade pending", () => {
  it("changes nothing when the card is declined, and the downgrade stays pending", async () => {
    const { stripe, ctx, deps } = await withPendingDowngrade();
    const preview = await previewPlanChange(ctx, upgradeB, deps);
    stripe.declineNextCharge = true;

    await expect(applyPlanChange(ctx, upgradeB, preview.previewedAt, deps)).rejects.toMatchObject({ type: "StripeCardError" });

    expect(stripe.status).toBe("active");
    expect(planOf(stripe, B)).toBe("cd_plan_starter");
    expect(stripe.invoices).toHaveLength(0);
    expect(stripe.schedule?.status).toBe("active");
    expect(pendingFor(stripe.scheduleObject(), A)).toBe("plan");
    expect(pendingFor(stripe.scheduleObject(), B)).toBeNull();

    stripe.advanceTo(RENEWAL + 60);
    expect([planOf(stripe, A), planOf(stripe, B)]).toEqual(["cd_plan_starter", "cd_plan_starter"]);
  });

  it("charges once with a good card, and keeps the downgrade pending with nothing pending for the upgraded business", async () => {
    const { stripe, ctx, deps } = await withPendingDowngrade();
    const preview = await previewPlanChange(ctx, upgradeB, deps);
    await applyPlanChange(ctx, upgradeB, preview.previewedAt, deps);

    expect(stripe.status).toBe("active");
    expect(planOf(stripe, B)).toBe("cd_plan_pro");
    expect(stripe.invoices).toHaveLength(1);
    expect(stripe.invoices[0]).toMatchObject({ status: "paid", amount_due: preview.amountCents });
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([preview.extraCredits]);
    expect(stripe.calls.find((c) => c.method === "updateSubscription")!.params).toMatchObject({
      proration_behavior: "always_invoice",
      proration_date: preview.previewedAt,
      payment_behavior: "error_if_incomplete",
    });
    expect(pendingFor(stripe.scheduleObject(), A)).toBe("plan");
    expect(pendingFor(stripe.scheduleObject(), B)).toBeNull();

    stripe.advanceTo(RENEWAL + 60);
    expect([planOf(stripe, A), planOf(stripe, B)]).toEqual(["cd_plan_starter", "cd_plan_pro"]);
    // The renewal bills Starter for A and Pro for B; the upgrade was charged only once.
    expect(stripe.invoices.map((i) => i.amount_due)).toEqual([preview.amountCents, 14900 + 24900]);
  });
});

describe("when the pending change can't be scheduled again", () => {
  const released = (stripe: Awaited<ReturnType<typeof withPendingDowngrade>>["stripe"]) => stripe.calls.some((c) => c.method === "releaseSchedule");

  it("tries once more with the schedule it already made, and the downgrade stays pending", async () => {
    const { stripe, ctx, deps } = await withPendingDowngrade();
    const preview = await previewPlanChange(ctx, upgradeB, deps);
    const real = stripe.updateSchedule.bind(stripe);
    let failures = 0;
    stripe.updateSchedule = async (id, params, key) => {
      if (released(stripe) && failures === 0) {
        failures++;
        throw new Error("Stripe hiccup");
      }
      return real(id, params, key);
    };
    await applyPlanChange(ctx, upgradeB, preview.previewedAt, deps);
    // One schedule for the downgrade, one made again after the upgrade: the retry reused it.
    expect(stripe.calls.filter((c) => c.method === "createScheduleFromSubscription")).toHaveLength(2);
    expect(pendingFor(stripe.scheduleObject(), A)).toBe("plan");
    expect(planOf(stripe, B)).toBe("cd_plan_pro");
  });

  it("keeps the paid change, tells the user it worked, and raises an admin alert", async () => {
    const { stripe, ctx, deps } = await withPendingDowngrade();
    const preview = await previewPlanChange(ctx, upgradeB, deps);
    const real = stripe.updateSchedule.bind(stripe);
    stripe.updateSchedule = async (id, params, key) => {
      if (released(stripe)) throw new Error("Stripe down");
      return real(id, params, key);
    };
    const alerts: string[] = [];
    const done = await applyPlanChange(ctx, upgradeB, preview.previewedAt, { ...deps, onScheduleLost: async (m) => void alerts.push(m) });
    expect(done.message).toBeTruthy();
    expect(planOf(stripe, B)).toBe("cd_plan_pro");
    expect(stripe.invoices).toHaveLength(1);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain("was lost after a paid change");
  });
});
