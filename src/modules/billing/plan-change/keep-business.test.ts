import { describe, expect, it } from "vitest";
import { A, B, RENEWAL, planOf, setup } from "./scenario.test-helpers";
import { previewPlanChange } from "./service";

// B1: a scheduled downgrade or removal can be taken back before it happens. Same in-memory Stripe as service.test.ts.

describe("keep a business on its plan", () => {
  it("takes back a scheduled downgrade: the schedule is released and the next renewal keeps Pro", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    expect(stripe.schedule?.status).toBe("active");

    const { preview, done } = await change({ kind: "keepBusiness", businessId: A });
    expect(preview.headline).toBe("Acme Plumbing stays on your plan, on Pro.");
    expect(done.message).toBe("Acme Plumbing stays on your plan, on Pro.");
    expect(stripe.schedule?.status).toBe("released");

    stripe.advanceTo(RENEWAL + 60);
    expect(planOf(stripe, A)).toBe("cd_plan_pro");
  });

  it("takes back a scheduled removal: the business is still billed after the renewal", async () => {
    const { stripe, change } = setup();
    await change({ kind: "remove", businessId: B });
    const { done } = await change({ kind: "keepBusiness", businessId: B });
    expect(done.message).toBe("Bay Dental stays on your plan, on Starter.");

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.items.map((i) => i.metadata.business_id).sort()).toEqual([A, B]);
  });

  it("keeps the other business's scheduled change when only one is taken back", async () => {
    const { stripe, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "remove", businessId: B });

    await change({ kind: "keepBusiness", businessId: A });
    expect(stripe.schedule?.status).toBe("active");
    expect(stripe.calls.some((c) => c.method === "releaseSchedule")).toBe(false);

    stripe.advanceTo(RENEWAL + 60);
    expect(stripe.items.map((i) => i.metadata.business_id)).toEqual([A]);
    expect(planOf(stripe, A)).toBe("cd_plan_pro");
  });

  it("works during a trial, and the trial end stays on the schedule", async () => {
    const { stripe, change } = setup({ a: "price_pro", status: "trialing" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "remove", businessId: B });
    await change({ kind: "keepBusiness", businessId: B });
    const update = stripe.calls.filter((c) => c.method === "updateSchedule").at(-1)!;
    expect(JSON.stringify(update.params)).toContain("trial_end");
    expect(stripe.schedule?.status).toBe("active");
  });

  it("refuses when nothing is scheduled for the business", async () => {
    const { ctx, deps, stripe } = setup();
    await expect(previewPlanChange(ctx, { kind: "keepBusiness", businessId: A }, deps)).rejects.toMatchObject({
      status: 409,
      message: "Nothing is scheduled to change for Acme Plumbing.",
    });
    await stripe.createScheduleFromSubscription(stripe.subscriptionId, "k");
    await expect(previewPlanChange(ctx, { kind: "keepBusiness", businessId: A }, deps)).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a business that is not on the plan, and one that was deleted", async () => {
    const { ctx, deps } = setup();
    await expect(previewPlanChange(ctx, { kind: "keepBusiness", businessId: "00000000-0000-4000-8000-00000000000c" }, deps)).rejects.toMatchObject({ status: 404 });
    ctx.businesses.find((b) => b.id === A)!.deleted = true;
    await expect(previewPlanChange(ctx, { kind: "keepBusiness", businessId: A }, deps)).rejects.toMatchObject({ status: 409 });
  });
});

describe("a business that is leaving the plan", () => {
  it("cannot be upgraded or downgraded until it is kept", async () => {
    const { ctx, deps, change } = setup({ a: "price_pro" });
    await change({ kind: "remove", businessId: A });
    const message = "Acme Plumbing is coming off your plan. Keep it on the plan first, then make this change.";
    await expect(previewPlanChange(ctx, { kind: "downgrade", businessId: A, planId: "starter" }, deps)).rejects.toMatchObject({ status: 409, message });
    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: A, planId: "pro" }, deps)).rejects.toMatchObject({ status: 409 });
    // Another business is unaffected.
    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: B, planId: "pro" }, deps)).resolves.toBeTruthy();
    await change({ kind: "keepBusiness", businessId: A });
    await expect(previewPlanChange(ctx, { kind: "downgrade", businessId: A, planId: "starter" }, deps)).resolves.toBeTruthy();
  });
});
