import { describe, expect, it } from "vitest";
import { billingView } from "../account/service";
import type { BillingRows } from "../account/dal";
import { A, B, RENEWAL, planOf, setup } from "./scenario.test-helpers";
import type { PlanChange } from "./planner";
import { applyPlanChange, previewPlanChange } from "./service";

// BUG-124: cancel, then "Keep my plan", must leave the plan exactly as it was before the cancel, scheduled changes
// included (a dropped downgrade billed $398 instead of $298). Same in-memory Stripe as service.test.ts.

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const lastInvoice = (stripe: ReturnType<typeof setup>["stripe"]) => stripe.invoices.at(-1)!;
const nextPhasePrices = (stripe: ReturnType<typeof setup>["stripe"]) =>
  stripe.schedule!.phases.find((p) => p.start === RENEWAL)?.items.map((i) => [i.metadata.business_id, i.price]);

function rows(): BillingRows {
  return {
    agency: { status: "active", trialEndsAt: null, periodEndsAt: iso(RENEWAL), subscriptionId: "sub_fake", customerId: "cus_fake" },
    plans: [
      { id: "starter", name: "Starter", priceCents: 14900, monthlyCredits: 1200 },
      { id: "pro", name: "Pro", priceCents: 24900, monthlyCredits: 2500 },
    ],
    businesses: [
      { id: A, name: "Acme Plumbing", planId: "pro", itemId: `si_${A}`, deleted: false },
      { id: B, name: "Bay Dental", planId: "starter", itemId: `si_${B}`, deleted: false },
    ],
  };
}

describe("cancel with a scheduled downgrade, then keep the plan", () => {
  it("brings the downgrade back, so the next bill is the lower price", async () => {
    const { stripe, ctx, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    const scheduled = nextPhasePrices(stripe);

    const cancel = await change({ kind: "cancel" });
    expect(cancel.preview.details).toEqual([
      "Any plan credits left on October 1, 2026 are removed.",
      "Top-up credits stay on your account, but you can only use them with an active plan.",
      "Your results, past scans and share links stay. From October 1, 2026, questions, competitors and business details can't be changed.",
      "You can keep your plan any time before October 1, 2026.",
      "Your change to Starter for Acme Plumbing is also canceled.",
      "If you keep your plan, this change comes back.",
    ]);
    expect(cancel.done.message).toBe(
      "Your plan ends on October 1, 2026. Your scheduled change is also canceled. It comes back if you keep your plan.",
    );
    // One schedule update: the plan ends after the current phase, and the dropped phase waits in metadata.
    expect(stripe.calls.some((c) => c.method === "releaseSchedule")).toBe(false);
    expect(stripe.schedule).toMatchObject({ status: "active", endBehavior: "cancel" });
    expect(stripe.schedule!.phases).toHaveLength(1);
    expect(stripe.subscription()).toMatchObject({ cancel_at: RENEWAL, cancel_at_period_end: false });

    // The billing page shows the plan as ending, with no next charge (Stripe has no next bill to preview).
    const view = await billingView({ rows: rows(), access: { context: ctx, stripe } });
    expect(view).toMatchObject({ stripe: "ok", cancelAt: iso(RENEWAL), nextCharge: null });

    const keep = await change({ kind: "keep" });
    expect(keep.preview.headline).toBe("Your plan will keep going after October 1, 2026.");
    expect(keep.preview.details).toEqual(["Acme Plumbing still moves to Starter on October 1, 2026."]);
    expect(keep.done.message).toBe("Your plan will keep going. Acme Plumbing moves to Starter on October 1, 2026.");
    expect(stripe.schedule).toMatchObject({ status: "active", endBehavior: "release", metadata: {} });
    expect(stripe.subscription()).toMatchObject({ cancel_at: null, cancel_at_period_end: false });
    // Exactly the phase that was there before the cancel, same prices.
    expect(nextPhasePrices(stripe)).toEqual(scheduled);

    const after = await billingView({ rows: rows(), access: { context: ctx, stripe } });
    expect(after.cancelAt).toBeNull();
    expect(after.nextCharge).toEqual({ at: iso(RENEWAL), amountCents: 14900 + 14900 });
    expect(after.onPlan.find((b) => b.id === A)?.pending).toEqual({ kind: "plan", planName: "Starter", at: iso(RENEWAL) });

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.status).toBe("active");
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
    expect(lastInvoice(stripe).amount_due).toBe(29800);
  });

  it("ends the plan with no bill when it is not kept", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "cancel" });
    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.status).toBe("canceled");
    expect(stripe.invoices).toHaveLength(0);
  });

  it("blocks other changes until the plan is kept", async () => {
    const { ctx, deps, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "cancel" });
    const message = "Your plan is set to end. Keep your plan first, then make this change.";
    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: B, planId: "pro" }, deps)).rejects.toThrow(message);
    await expect(previewPlanChange(ctx, { kind: "keepBusiness", businessId: A }, deps)).rejects.toThrow(message);
    await expect(previewPlanChange(ctx, { kind: "cancel" }, deps)).rejects.toThrow(message);
  });
});

describe("cancel with a scheduled removal, then keep the plan", () => {
  it("brings the removal back, so the business still comes off at renewal", async () => {
    const { stripe, change } = setup();
    await change({ kind: "remove", businessId: B });

    const cancel = await change({ kind: "cancel" });
    expect(cancel.preview.details).toContain("Your change to take Bay Dental off your plan is also canceled.");
    const keep = await change({ kind: "keep" });
    expect(keep.preview.details).toEqual(["Bay Dental still comes off your plan on October 1, 2026."]);
    expect(keep.done.message).toBe("Your plan will keep going. Bay Dental comes off your plan on October 1, 2026.");

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.items.map((i) => i.metadata.business_id)).toEqual([A]);
    expect(lastInvoice(stripe).amount_due).toBe(14900);
  });

  it("brings back a downgrade and a removal together", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "remove", businessId: B });
    const cancel = await change({ kind: "cancel" });
    expect(cancel.preview.details.at(-1)).toBe("If you keep your plan, these changes come back.");
    expect(cancel.done.message).toContain("Your scheduled changes are also canceled. They come back if you keep your plan.");
    await change({ kind: "keep" });

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.items.map((i) => i.metadata.business_id)).toEqual([A]);
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
  });
});

describe("cancel and keep during a trial", () => {
  it("keeps the trial end on the schedule each time, and the downgrade starts when the trial ends", async () => {
    const { stripe, change } = setup({ a: "price_pro", status: "trialing" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    const cancel = await change({ kind: "cancel" });
    expect(cancel.preview.headline).toMatch(/^Your free trial keeps going until \w+ \d+, \d{4}\. Your card won't be charged\.$/);
    expect(cancel.preview.details.slice(-2)).toEqual([
      "Your change to Starter for Acme Plumbing is also canceled.",
      "If you keep your plan, this change comes back.",
    ]);
    await change({ kind: "keep" });

    const updates = stripe.calls.filter((c) => c.method === "updateSchedule").slice(-2);
    for (const update of updates) {
      const [current] = (update.params as { phases: { trial_end?: number }[] }).phases;
      expect(current.trial_end).toBe(RENEWAL);
    }
    expect(stripe.subscription()).toMatchObject({ status: "trialing", trial_end: RENEWAL });

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.status).toBe("active");
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
    expect(lastInvoice(stripe).amount_due).toBe(29800);
  });
});

describe("cancel with nothing scheduled", () => {
  it("still uses cancel_at_period_end, and keep undoes it", async () => {
    const { stripe, change } = setup();
    const cancel = await change({ kind: "cancel" });
    // Credits, top-ups, what stays and the undo; no scheduled-change lines.
    expect(cancel.preview.details).toHaveLength(4);
    expect(cancel.preview.details.join(" ")).not.toMatch(/also canceled/);
    expect(cancel.done.message).toBe("Your plan ends on October 1, 2026.");
    expect(stripe.calls.some((c) => c.method === "updateSchedule")).toBe(false);
    expect(stripe.cancelAtPeriodEnd).toBe(true);

    const keep = await change({ kind: "keep" });
    expect(keep.preview.details).toEqual([]);
    expect(keep.done.message).toBe("Your plan will keep going.");
    expect(stripe.cancelAtPeriodEnd).toBe(false);
    expect(stripe.schedule).toBeNull();
  });
});

describe("keep sent twice", () => {
  it("changes Stripe once when the same confirm is sent twice, and a later replay changes nothing", async () => {
    const { stripe, ctx, deps, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    const scheduled = nextPhasePrices(stripe);
    await change({ kind: "cancel" });

    const keep: PlanChange = { kind: "keep" };
    const preview = await previewPlanChange(ctx, keep, deps);
    await Promise.all([applyPlanChange(ctx, keep, preview.previewedAt, deps), applyPlanChange(ctx, keep, preview.previewedAt, deps)]);
    const keys = stripe.calls.filter((c) => c.method === "updateSchedule").slice(-2).map((c) => c.key);
    expect(new Set(keys).size).toBe(1);
    expect(nextPhasePrices(stripe)).toEqual(scheduled);

    const writes = stripe.calls.filter((c) => c.method.startsWith("update")).length;
    await expect(applyPlanChange(ctx, keep, preview.previewedAt, deps)).rejects.toMatchObject({
      status: 409,
      message: "Your plan is not set to end.",
    });
    expect(stripe.calls.filter((c) => c.method.startsWith("update"))).toHaveLength(writes);
    expect(nextPhasePrices(stripe)).toEqual(scheduled);
  });
});
