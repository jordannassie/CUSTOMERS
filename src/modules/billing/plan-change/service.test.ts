import { describe, expect, it } from "vitest";
import { A, B, C, creditsOf, MID_MONTH, PERIOD_START, planOf, RENEWAL, setup } from "./scenario.test-helpers";
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

    expect(planOf(stripe, A)).toBe("cd_plan_pro");
    expect(stripe.invoices).toHaveLength(1);
    expect(stripe.invoices[0].amount_due).toBe(5000);
    // The webhook grants what the preview promised when this invoice is paid (B-42).
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([650]);

    const update = stripe.calls.find((c) => c.method === "updateSubscription")!;
    expect(update.params).toMatchObject({
      items: [{ id: `si_${A}`, price_data: { product: "cd_plan_pro", unit_amount: 24900, currency: "usd", recurring: { interval: "month" } } }],
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
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
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
    const { preview, done } = await change({ kind: "upgrade", businessId: A, planId: "pro" });
    expect(preview.headline).toBe("You pay nothing today. You're still on your free trial.");
    // BUG-245: the first bill after the trial, Pro for Acme and Starter for the other business.
    expect(preview.details).toEqual([
      "From October 1, 2026, Acme Plumbing will cost $249 a month on Pro.",
      "Your first bill on October 1, 2026 will be $398.",
      "You can switch plans again any time before then.",
    ]);
    // B2: no payment to wait for during a trial.
    expect(done.message).toBe("Acme Plumbing is now on Pro. You won't be charged until your trial ends on October 1, 2026.");
    expect(preview).toMatchObject({ amountCents: 0, extraCredits: 0 });
    expect(planOf(stripe, A)).toBe("cd_plan_pro");
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
    expect(planOf(stripe, C)).toBe("cd_plan_starter");
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([600]);
  });

  it("gives a business on a plan another business already has a price of its own (BUG-103)", async () => {
    const { stripe, change } = setup();
    await change({ kind: "add", businessId: C, planId: "starter" });
    const prices = stripe.items.map((i) => i.price);
    expect(new Set(prices).size).toBe(3);
    expect([A, B, C].map((id) => planOf(stripe, id))).toEqual(["cd_plan_starter", "cd_plan_starter", "cd_plan_starter"]);
  });
});

describe("plan switch during a trial (2026-10-17)", () => {
  it("moves a business down now, with the first bill after the trial, and back up again", async () => {
    const { stripe, change } = setup({ a: "price_pro", status: "trialing" });
    const down = await change({ kind: "downgrade", businessId: A, planId: "starter" });
    expect(down.preview.timing).toBe("now");
    expect(down.preview.headline).toBe("You pay nothing today. You're still on your free trial.");
    expect(down.preview.details).toEqual([
      "From October 1, 2026, Acme Plumbing will cost $149 a month on Starter.",
      "Your first bill on October 1, 2026 will be $298.",
      "You can switch plans again any time before then.",
    ]);
    expect(down.done.message).toBe("Acme Plumbing is now on Starter. You won't be charged until your trial ends on October 1, 2026.");
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
    expect(stripe.schedule).toBeNull();

    const up = await change({ kind: "upgrade", businessId: A, planId: "pro" });
    expect(up.preview.details[1]).toBe("Your first bill on October 1, 2026 will be $398.");
    expect(planOf(stripe, A)).toBe("cd_plan_pro");
    expect(stripe.invoices.filter((i) => i.amount_due > 0)).toHaveLength(0);

    // The trial ends on whatever plan the business is on then.
    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.invoices.at(-1)!.amount_due).toBe(39800);
  });

  it("says the first bill, not $0, when a business comes off during a trial (BUG-245)", async () => {
    const { change } = setup({ a: "price_pro", status: "trialing" });
    const { preview } = await change({ kind: "remove", businessId: B });
    expect(preview.details).toContain("Your first bill on October 1, 2026 will be $249.");
    expect(preview.details.join(" ")).not.toContain("$0");
  });
});

describe("downgrade at renewal", () => {
  it("keeps the plan until the period ends, then renews at the lower price with no refund", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    const { preview, done } = await change({ kind: "downgrade", businessId: A, planId: "starter" });

    expect(preview.headline).toBe("Acme Plumbing moves to Starter on October 1, 2026, when your plan renews.");
    expect(preview.details).toEqual([
      "Until then it stays on its current plan. There's no refund for this month.",
      "From October 1, 2026 it costs $149 a month.",
      "Your next bill will be $298.",
      "Credits you already have stay until they expire.",
    ]);
    expect(preview.amountCents).toBe(29800);
    expect(done.message).toBe("Acme Plumbing stays on its current plan until October 1, 2026, then moves to Starter.");

    expect(planOf(stripe, A)).toBe("cd_plan_pro");
    expect(stripe.invoices).toHaveLength(0);
    const update = stripe.calls.find((c) => c.method === "updateSchedule")!;
    expect(update.params).toMatchObject({
      end_behavior: "release",
      phases: [
        { start_date: PERIOD_START, end_date: RENEWAL },
        // B keeps its price; A gets a Starter price of its own, since Stripe refuses one price twice (BUG-103).
        { items: [{ price_data: { product: "cd_plan_starter", unit_amount: 14900 }, metadata: { business_id: A } }, { price: "price_starter", metadata: { business_id: B } }] },
      ],
    });

    stripe.advanceTo(RENEWAL + 60);
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
    expect(stripe.invoices).toHaveLength(1);
    expect(stripe.invoices[0].amount_due).toBe(29800);
    expect(creditsOf(stripe, 0).map((g) => g.amount)).toEqual([1200, 1200]);
  });

  it("keeps a pending downgrade when another business upgrades now", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    const { preview } = await change({ kind: "upgrade", businessId: B, planId: "pro" });

    expect(preview).toMatchObject({ amountCents: 5000, extraCredits: 650 });
    expect(planOf(stripe, B)).toBe("cd_plan_pro");
    stripe.advanceTo(RENEWAL + 60);
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
    expect(planOf(stripe, B)).toBe("cd_plan_pro");
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
    expect(preview.headline).toBe("Bay Dental stays on your plan until October 1, 2026. No refund.");
    expect(preview.details[0]).toBe("After that, scans for Bay Dental stop. Its results stay visible.");
    expect(preview.losses?.heading).toBe("From October 1, 2026, Bay Dental loses:");
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
    expect(preview.headline).toBe("Your plan stays active until October 1, 2026. You won't be charged again, and there's no refund for this month.");
    expect(preview.details[1]).toBe("Top-up credits stay on your account, but you can only use them with an active plan.");
    expect(done.message).toBe("Your plan ends on October 1, 2026.");
    expect(stripe.calls.some((c) => c.method === "previewInvoice")).toBe(false);
    expect(stripe.cancelAtPeriodEnd).toBe(true);
    expect(stripe.status).toBe("active");

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.status).toBe("canceled");
    expect(stripe.invoices).toHaveLength(0);
  });

  it("ends a pending downgrade's schedule instead of dropping it, and blocks other changes until the plan is kept", async () => {
    const { stripe, ctx, deps, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "cancel" });
    // BUG-124: the schedule ends the plan and keeps the downgrade for "Keep my plan" (cancel-keep.test.ts).
    expect(stripe.calls.map((c) => c.method)).not.toContain("releaseSchedule");
    expect(stripe.schedule).toMatchObject({ status: "active", endBehavior: "cancel" });

    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: B, planId: "pro" }, deps)).rejects.toThrow(
      "Your plan is set to end. Keep your plan first, then make this change.",
    );
    const { done } = await change({ kind: "keep" });
    expect(done.message).toBe("Your plan will keep going. Acme Plumbing moves to Starter on October 1, 2026.");
    expect(stripe.subscription().cancel_at).toBeNull();
  });
});
