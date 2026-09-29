import { describe, expect, it } from "vitest";
import { at, FakeStripe } from "./fake-stripe";
import { previewCopy } from "./copy";
import { copyFor } from "./copy.test-helpers";
import { buildPhases, checkChange, idempotencyKey, phasesOf, type PlanChangeContext } from "./planner";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

const ctx: PlanChangeContext = {
  agencyId: "agency-1",
  agencyStatus: "active",
  subscriptionId: "sub_fake",
  plans: [
    { id: "starter", name: "Starter", priceCents: 14900, stripePriceId: "price_starter" },
    { id: "pro", name: "Pro", priceCents: 24900, stripePriceId: "price_pro" },
    { id: "enterprise", name: "Enterprise", priceCents: 0, stripePriceId: null },
  ],
  businesses: [
    { id: A, name: "Acme Plumbing", planId: "starter", itemId: `si_${A}` },
    { id: B, name: "Bay Dental", planId: "starter", itemId: "si_old_link" },
  ],
};

function sub(opts: { status?: "active" | "trialing"; itemsWithoutMetadata?: boolean } = {}) {
  const fake = new FakeStripe({
    now: at("2026-09-16T00:00:00Z"),
    periodStart: at("2026-09-01T00:00:00Z"),
    status: opts.status,
    items: [
      { businessId: A, price: "price_starter" },
      { businessId: B, price: "price_starter" },
    ],
  });
  const s = fake.subscription();
  if (opts.itemsWithoutMetadata) {
    s.items.data[1].id = "si_old_link";
    s.items.data[1].metadata = {};
  }
  return s;
}

describe("checkChange", () => {
  it("finds an item by the saved item ID when it has no business_id", () => {
    const checked = checkChange(ctx, sub({ itemsWithoutMetadata: true }), { kind: "upgrade", businessId: B, planId: "pro" });
    expect(checked.item?.id).toBe("si_old_link");
  });

  it("refuses a plan with no self-serve price", () => {
    expect(() => checkChange(ctx, sub(), { kind: "upgrade", businessId: A, planId: "enterprise" })).toThrow(
      "That plan can't be chosen here. Contact us to set it up.",
    );
  });

  it("refuses the plan the business is already on", () => {
    expect(() => checkChange(ctx, sub(), { kind: "upgrade", businessId: A, planId: "starter" })).toThrow(
      "Acme Plumbing is already on Starter.",
    );
  });

  it("refuses adding a business that already has an item", () => {
    expect(() => checkChange(ctx, sub(), { kind: "add", businessId: A, planId: "pro" })).toThrow(
      "Acme Plumbing is already on your plan.",
    );
  });
});

describe("buildPhases", () => {
  it("keeps the trial end on the current phase during a trial", () => {
    const s = sub({ status: "trialing" });
    const checked = checkChange(ctx, s, { kind: "remove", businessId: B });
    const items = s.items.data.map((i) => ({ price: i.price.id, quantity: 1, metadata: { ...i.metadata } }));
    const phases = buildPhases(s, { start: 1, end: 2, items }, null, checked);
    expect(phases[0]).toMatchObject({ start_date: 1, end_date: 2, trial_end: s.trial_end });
    expect(phases[1].items).toEqual([items[0]]);
    expect(phases[1]).toMatchObject({ duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
  });

  it("refuses a schedule someone else gave more than one future phase", () => {
    const schedule = {
      id: "sub_sched_x",
      current_phase: { start_date: 1, end_date: 2 },
      phases: [{ start_date: 1 }, { start_date: 2 }, { start_date: 3 }],
    } as never;
    expect(() => phasesOf(schedule)).toThrow("more than one future phase");
  });
});

describe("idempotencyKey", () => {
  it("is the same for the same confirm and differs per change", () => {
    const upgrade = { kind: "upgrade", businessId: A, planId: "pro" } as const;
    expect(idempotencyKey("ag", upgrade, 100)).toBe(idempotencyKey("ag", upgrade, 100));
    expect(idempotencyKey("ag", upgrade, 100)).not.toBe(idempotencyKey("ag", { ...upgrade, businessId: B }, 100));
    expect(idempotencyKey("ag", upgrade, 100)).not.toBe(idempotencyKey("ag", upgrade, 101));
  });
});

describe("copy", () => {
  it("has no long dashes in any message", () => {
    for (const text of copyFor()) expect(text).not.toMatch(/[–—]/);
  });

  it("never tells a trial user about charges again or refunds when they cancel (BUG-8)", () => {
    const input = { change: { kind: "cancel" } as const, businessName: null, planName: null, planPriceCents: null };
    const cancel = (trialing: boolean) =>
      previewCopy({ ...input, trialing, amountCents: 0, extraCredits: 0, effectiveAt: 1_790_000_000 });
    const trial = cancel(true);
    expect(trial.headline).toBe("Your free trial ends on September 21, 2026. Your trial credits work until then.");
    expect(trial.details[0]).toBe("Your card won't be charged.");
    expect([trial.headline, ...trial.details].join(" ")).not.toMatch(/again|refund/);
    expect(cancel(false).details[0]).toBe("You won't be charged again, and there's no refund for this month.");
  });
});
