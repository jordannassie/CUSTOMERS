import { describe, expect, it, vi } from "vitest";
import { at } from "../plan-change/fake-stripe";
import { monthAfter } from "../plan-change/fake-stripe-objects";
import { PlanChangeError } from "../plan-change/planner";
import { A, B, creditsOf, MID_MONTH, planOf, plansByProduct, setup } from "../plan-change/scenario.test-helpers";
import { DECLINED, endTrialNow, monthLater, planNowOffer, type EndTrialDeps } from "./service";

// "Start my plan now" (D-16, MVP_SPEC 4.4) on the in-memory Stripe: a trial of 2 Starter businesses, mid-month.

const ATTEMPT = "00000000-0000-4000-8000-0000000000a1";
const RETRY = "00000000-0000-4000-8000-0000000000a2";

function trial(opts: { status?: "active" | "trialing" } = {}) {
  const s = setup({ status: opts.status ?? "trialing" });
  const deps: EndTrialDeps = { stripe: s.stripe, plansByProduct, now: () => new Date(s.stripe.clock * 1000) };
  return { ...s, deps };
}

const updates = (s: ReturnType<typeof trial>) => s.stripe.calls.filter((c) => c.method === "updateSubscription");

describe("start my plan now", () => {
  it("shows the full month for the businesses on the plan and the credits it adds", async () => {
    const { ctx, deps } = trial();
    const offer = await planNowOffer(ctx, deps);
    expect(offer).toMatchObject({ amountCents: 29800, credits: 2400, businessCount: 2 });
    expect(offer.lines).toEqual([
      "Your trial ends today instead of on October 1, 2026.",
      "We charge the card on file $298 today for the 2 businesses on your plan. Your next charge is on October 16, 2026.",
      "2,400 credits are added for the month.",
    ]);
  });

  it("ends the trial now: one charge for the month, plan credits from the paid invoice, status active", async () => {
    const s = trial();
    expect(await endTrialNow(s.ctx, ATTEMPT, s.deps)).toEqual({ alreadyActive: false, started: false });

    expect(updates(s)).toEqual([
      expect.objectContaining({
        params: { trial_end: "now", payment_behavior: "error_if_incomplete" },
        key: `end-trial:agency-1:${ATTEMPT}:subscription`,
      }),
    ]);
    const sub = s.stripe.subscription();
    // customer.subscription.updated saves this status on the agency, which is what lets a 3rd business in.
    expect(sub.status).toBe("active");
    expect(sub.trial_end).toBe(MID_MONTH);
    expect(s.stripe.invoices.map((i) => [i.status, i.amount_paid])).toEqual([["paid", 29800]]);
    // What invoice.paid grants: each business's monthly credits, for the new period that starts today.
    expect(creditsOf(s.stripe, 0).map((g) => [g.source, g.amount, g.reason, g.expiresAt.getTime() / 1000])).toEqual([
      ["plan", 1200, "period", monthAfter(MID_MONTH)],
      ["plan", 1200, "period", monthAfter(MID_MONTH)],
    ]);
  });

  it("is idempotent: a second click, or two at once, charges once", async () => {
    const s = trial();
    await Promise.all([endTrialNow(s.ctx, ATTEMPT, s.deps), endTrialNow(s.ctx, ATTEMPT, s.deps)]);
    expect(await endTrialNow(s.ctx, ATTEMPT, s.deps)).toEqual({ alreadyActive: true, started: false });
    expect(s.stripe.invoices).toHaveLength(1);
    expect(new Set(updates(s).map((c) => c.key))).toEqual(new Set([`end-trial:agency-1:${ATTEMPT}:subscription`]));
  });

  it("refuses when there is no trial to end", async () => {
    const active = trial({ status: "active" });
    await expect(planNowOffer(active.ctx, active.deps)).rejects.toMatchObject({ status: 409 });
    expect(await endTrialNow(active.ctx, ATTEMPT, active.deps)).toEqual({ alreadyActive: true, started: false });
    expect(updates(active)).toEqual([]);

    const pastDue = trial({ status: "active" });
    pastDue.stripe.status = "past_due";
    await expect(endTrialNow(pastDue.ctx, ATTEMPT, pastDue.deps)).rejects.toBeInstanceOf(PlanChangeError);
    expect(updates(pastDue)).toEqual([]);

    const cancelled = trial();
    cancelled.stripe.cancelAtPeriodEnd = true;
    await expect(endTrialNow(cancelled.ctx, ATTEMPT, cancelled.deps)).rejects.toMatchObject({ status: 409 });
    expect(updates(cancelled)).toEqual([]);

    const cancelledWithChange = trial();
    await cancelledWithChange.change({ kind: "remove", businessId: B });
    cancelledWithChange.stripe.schedule!.endBehavior = "cancel";
    await expect(endTrialNow(cancelledWithChange.ctx, ATTEMPT, cancelledWithChange.deps)).rejects.toMatchObject({ status: 409 });
    expect(cancelledWithChange.stripe.schedule?.status).toBe("active");

    const noPlan = trial();
    await expect(endTrialNow({ ...noPlan.ctx, subscriptionId: null }, ATTEMPT, noPlan.deps)).rejects.toMatchObject({ status: 409 });
  });

  it("a declined card charges nothing and the trial goes on; a new try then works", async () => {
    const s = trial();
    s.stripe.declineNextCharge = true;
    await expect(endTrialNow(s.ctx, ATTEMPT, s.deps)).rejects.toMatchObject({ type: "StripeCardError", statusCode: 402 });
    expect(s.stripe.subscription().status).toBe("trialing");
    expect(s.stripe.invoices).toEqual([]);

    expect(await endTrialNow(s.ctx, RETRY, s.deps)).toEqual({ alreadyActive: false, started: false });
    expect(s.stripe.subscription().status).toBe("active");
  });

  it("treats a subscription left unpaid as declined", async () => {
    const s = trial();
    vi.spyOn(s.stripe, "updateSubscription").mockResolvedValue({ ...s.stripe.subscription(), status: "past_due" });
    await expect(endTrialNow(s.ctx, ATTEMPT, s.deps)).rejects.toEqual(new PlanChangeError(402, DECLINED));
  });

  it("with a removal scheduled for the trial end, it happens now and the first month bills the rest", async () => {
    const s = trial();
    await s.change({ kind: "remove", businessId: B });
    expect(s.stripe.schedule?.status).toBe("active");

    const offer = await planNowOffer(s.ctx, s.deps);
    expect(offer).toMatchObject({ amountCents: 14900, credits: 1200, businessCount: 1 });
    expect(offer.lines.at(-1)).toBe("Changes you scheduled for the end of your trial happen today.");

    await endTrialNow(s.ctx, ATTEMPT, s.deps);
    expect(s.stripe.calls.map((c) => c.method).filter((m) => m.startsWith("update") || m.startsWith("release"))).toEqual([
      "updateSchedule",
      "updateSchedule",
      "releaseSchedule",
      "updateSubscription",
    ]);
    expect(s.stripe.schedule?.status).toBe("released");
    expect(planOf(s.stripe, A)).toBe("cd_plan_starter");
    expect(planOf(s.stripe, B)).toBeUndefined();
    expect(s.stripe.subscription().status).toBe("active");
    expect(s.stripe.invoices.map((i) => i.amount_paid)).toEqual([14900]);
  });
});

describe("monthLater", () => {
  it("clamps the day like Stripe", () => {
    expect(monthLater(at("2026-01-31T10:00:00Z"))).toBe(at("2026-02-28T10:00:00Z"));
    expect(monthLater(at("2026-09-16T00:00:00Z"))).toBe(at("2026-10-16T00:00:00Z"));
  });
});
