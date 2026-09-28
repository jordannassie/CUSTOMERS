import { describe, expect, it } from "vitest";
import { A, B, C, creditsOf, MID_MONTH, PERIOD_START, priceOf, RENEWAL, setup } from "./scenario.test-helpers";
import type { PlanChange } from "./planner";
import { applyPlanChange, previewPlanChange } from "./service";

// Test-clock scenarios against the in-memory Stripe (no Stripe calls).

describe("upgrade mid-month", () => {
  it("previews the prorated charge and credits, then charges exactly that now", async () => {
    const { stripe, change } = setup();
    const { preview, done } = await change({ kind: "upgrade", businessId: A, planId: "pro" });

    expect(preview.headline).toBe("You'll pay $50 today and get 650 extra credits now.");
    expect(preview).toMatchObject({ timing: "now", amountCents: 5000, extraCredits: 650 });
    expect(preview.details).toContain("Acme Plumbing will cost $249 a month on Pro.");
    expect(done.message).toBe("Acme Plumbing is now on Pro. The extra credits appear once the payment goes through.");

    expect(priceOf(stripe, A)).toBe("price_pro");
    expect(stripe.invoices).toHaveLength(1);
    expect(stripe.invoices[0].amount_due).toBe(5000);
    // The webhook grants what the preview promised when this invoice is paid (B-42).
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([650]);

    const update = stripe.calls.find((c) => c.method === "updateSubscription")!;
    expect(update.params).toMatchObject({
      items: [{ id: `si_${A}`, price: "price_pro" }],
      proration_behavior: "always_invoice",
      proration_date: preview.previewedAt,
      payment_behavior: "error_if_incomplete",
    });
  });

  it("changes nothing when the card is declined", async () => {
    const { stripe, ctx, deps } = setup();
    const change: PlanChange = { kind: "upgrade", businessId: A, planId: "pro" };
    const preview = await previewPlanChange(ctx, change, deps);
    stripe.declineNextCharge = true;
    await expect(applyPlanChange(ctx, change, preview.previewedAt, deps)).rejects.toMatchObject({ type: "StripeCardError" });
    expect(priceOf(stripe, A)).toBe("price_starter");
    expect(stripe.invoices).toHaveLength(0);
  });

  it("charges once when the same confirm is sent twice", async () => {
    const { stripe, ctx, deps } = setup();
    const change: PlanChange = { kind: "upgrade", businessId: A, planId: "pro" };
    const preview = await previewPlanChange(ctx, change, deps);
    await Promise.all([
      applyPlanChange(ctx, change, preview.previewedAt, deps),
      applyPlanChange(ctx, change, preview.previewedAt, deps),
    ]);
    const keys = stripe.calls.filter((c) => c.method === "updateSubscription").map((c) => c.key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
    expect(stripe.invoices).toHaveLength(1);
  });

  it("refuses a preview older than 15 minutes", async () => {
    const { ctx, deps } = setup();
    await expect(
      applyPlanChange(ctx, { kind: "upgrade", businessId: A, planId: "pro" }, MID_MONTH - 16 * 60, deps),
    ).rejects.toThrow("Check the new amount and confirm again.");
  });

  it("charges nothing during the trial", async () => {
    const { stripe, change } = setup({ status: "trialing" });
    const { preview } = await change({ kind: "upgrade", businessId: A, planId: "pro" });
    expect(preview.headline).toBe("You pay nothing today. You're still on your free trial.");
    expect(preview.details).toEqual(["From October 1, 2026, Acme Plumbing will cost $249 a month on Pro."]);
    expect(preview).toMatchObject({ amountCents: 0, extraCredits: 0 });
    expect(priceOf(stripe, A)).toBe("price_pro");
    expect(stripe.invoices).toHaveLength(0);
  });
});

describe("add a business mid-month", () => {
  it("adds an item named for the business with a prorated charge and credits", async () => {
    const { stripe, change } = setup();
    const { preview, done } = await change({ kind: "add", businessId: C, planId: "starter" });
    expect(preview).toMatchObject({ amountCents: 7450, extraCredits: 600 });
    expect(preview.headline).toBe("You'll pay $74.50 today and get 600 extra credits now.");
    expect(done.message).toBe("Corner Bakery is on your plan. Its credits appear once the payment goes through.");
    expect(priceOf(stripe, C)).toBe("price_starter");
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([600]);
  });
});

describe("downgrade at renewal", () => {
  it("keeps the plan until the period ends, then renews at the lower price with no refund", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    const { preview, done } = await change({ kind: "downgrade", businessId: A, planId: "starter" });

    expect(preview.headline).toBe("Takes effect on October 1, 2026. No refund.");
    expect(preview.details).toEqual([
      "From then, Acme Plumbing is on Starter at $149 a month.",
      "Your next bill will be $298.",
      "Credits you already have stay until they expire.",
    ]);
    expect(preview.amountCents).toBe(29800);
    expect(done.message).toBe("Acme Plumbing moves to Starter on October 1, 2026.");

    expect(priceOf(stripe, A)).toBe("price_pro");
    expect(stripe.invoices).toHaveLength(0);
    const update = stripe.calls.find((c) => c.method === "updateSchedule")!;
    expect(update.params).toMatchObject({
      end_behavior: "release",
      phases: [
        { start_date: PERIOD_START, end_date: RENEWAL },
        { items: [{ price: "price_starter", metadata: { business_id: A } }, { price: "price_starter", metadata: { business_id: B } }] },
      ],
    });

    stripe.advanceTo(RENEWAL + 60);
    expect(priceOf(stripe, A)).toBe("price_starter");
    expect(stripe.invoices).toHaveLength(1);
    expect(stripe.invoices[0].amount_due).toBe(29800);
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([1200, 1200]);
  });

  it("keeps a pending downgrade when another business upgrades now", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    const { preview } = await change({ kind: "upgrade", businessId: B, planId: "pro" });

    expect(preview).toMatchObject({ amountCents: 5000, extraCredits: 650 });
    expect(priceOf(stripe, B)).toBe("price_pro");
    stripe.advanceTo(RENEWAL + 60);
    expect(priceOf(stripe, A)).toBe("price_starter");
    expect(priceOf(stripe, B)).toBe("price_pro");
  });

  it("refuses a downgrade to a dearer plan", async () => {
    const { ctx, deps } = setup();
    await expect(previewPlanChange(ctx, { kind: "downgrade", businessId: A, planId: "pro" }, deps)).rejects.toThrow(
      "Pro costs more than the current plan. Choose upgrade instead.",
    );
  });
});

describe("remove a business", () => {
  it("drops the item at renewal, not before", async () => {
    const { stripe, change } = setup();
    const { preview, done } = await change({ kind: "remove", businessId: B });
    expect(preview.headline).toBe("Takes effect on October 1, 2026. No refund.");
    expect(preview.details[0]).toBe("Scans for Bay Dental stop on that day.");
    expect(preview.amountCents).toBe(14900);
    expect(done.message).toBe("Bay Dental comes off your plan on October 1, 2026.");
    expect(stripe.items).toHaveLength(2);
    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.items.map((i) => i.metadata.business_id)).toEqual([A]);
  });

  it("points to cancel when it is the only business", async () => {
    const { ctx, deps } = setup({ b: null });
    await expect(previewPlanChange(ctx, { kind: "remove", businessId: A }, deps)).rejects.toThrow(
      "This is the only business on your plan. To stop paying, cancel your plan instead.",
    );
  });
});

describe("cancel", () => {
  it("ends the plan at the period end with no further charge", async () => {
    const { stripe, change } = setup();
    const { preview, done } = await change({ kind: "cancel" });
    expect(preview.headline).toBe("Your plan ends on October 1, 2026. Your plan credits work until then.");
    expect(preview.details[1]).toBe("Top-up credits stay on your account, but you can only use them with an active plan.");
    expect(done.message).toBe("Your plan ends on October 1, 2026.");
    expect(stripe.calls.some((c) => c.method === "previewInvoice")).toBe(false);
    expect(stripe.cancelAtPeriodEnd).toBe(true);
    expect(stripe.status).toBe("active");

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.status).toBe("canceled");
    expect(stripe.invoices).toHaveLength(0);
  });

  it("drops a pending downgrade first, and blocks other changes until the plan is kept", async () => {
    const { stripe, ctx, deps, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "cancel" });
    expect(stripe.calls.map((c) => c.method)).toContain("releaseSchedule");
    expect(stripe.schedule?.status).toBe("released");

    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: B, planId: "pro" }, deps)).rejects.toThrow(
      "Your plan is set to end. Keep your plan first, then make this change.",
    );
    const { done } = await change({ kind: "keep" });
    expect(done.message).toBe("Your plan will keep going.");
    expect(stripe.cancelAtPeriodEnd).toBe(false);
  });
});
