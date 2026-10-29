import { describe, expect, it } from "vitest";
import { previewCopy, type CopyInput } from "./copy";

// "Before you cancel" (2026-10-15): each sentence says only what the app does, with the real date and credits.
const END = 1_790_000_000; // September 21, 2026 (UTC)
const DATE = "September 21, 2026";
const base = { businessName: null, planName: null, planPriceCents: null, amountCents: 0, extraCredits: 0, effectiveAt: END };
const cancel = (trialing: boolean, credits?: CopyInput["credits"]) =>
  previewCopy({ ...base, change: { kind: "cancel" }, trialing, credits });
const remove = (trialing: boolean) =>
  previewCopy({ ...base, change: { kind: "remove", businessId: "b" }, trialing, businessName: "Bay Dental", amountCents: 14900 });

const LOST = ["Weekly scans and Run scan", "Score updates", "Competitor tracking", "New opportunities"];

describe("cancel preview", () => {
  it("during a trial: the trial runs to its end, nothing is charged, and the trial credits left are counted", () => {
    const copy = cancel(true, { plan: 150, topup: 0 });
    expect(copy.headline).toBe(`Your free trial keeps going until ${DATE}. Your card won't be charged.`);
    expect(copy.details).toEqual([
      `You have 150 trial credits left. Any left on ${DATE} are removed.`,
      "Top-up credits stay on your account, but you can only use them with an active plan.",
      `Your results, past scans and share links stay. From ${DATE}, questions, competitors and business details can't be changed.`,
      `You can keep your plan any time before ${DATE}.`,
    ]);
    expect(copy.losses).toEqual({ heading: `From ${DATE} you lose:`, items: LOST });
  });

  it("on a paid plan: active until the period end, plan credits and top-ups counted", () => {
    const copy = cancel(false, { plan: 830, topup: 1500 });
    expect(copy.headline).toBe(`Your plan stays active until ${DATE}. You won't be charged again, and there's no refund for this month.`);
    expect(copy.details.slice(0, 2)).toEqual([
      `You have 830 plan credits left. Any left on ${DATE} are removed.`,
      "Your 1,500 top-up credits stay on your account, but you can only use them with an active plan.",
    ]);
  });

  it("past due: does not promise no more charges, since the unpaid invoice can still be collected", () => {
    const copy = previewCopy({ ...base, change: { kind: "cancel" }, trialing: false, credits: { plan: 0, topup: 0 }, pastDue: true });
    expect(copy.headline).toBe(`Your plan ends on ${DATE}. You won't be charged for another month, but the unpaid invoice may still be collected.`);
    expect(copy.headline).not.toContain("won't be charged again");
  });

  it("says one credit, not one credits", () => {
    expect(cancel(false, { plan: 1, topup: 1 }).details.slice(0, 2)).toEqual([
      `You have 1 plan credit left. Any left on ${DATE} are removed.`,
      "Your 1 top-up credit stays on your account, but you can only use it with an active plan.",
    ]);
  });

  it("never says the trial ends now or that data is deleted", () => {
    for (const copy of [cancel(true, { plan: 10, topup: 0 }), cancel(false, { plan: 10, topup: 5 })]) {
      const text = [copy.headline, ...copy.details, copy.losses!.heading, ...copy.losses!.items].join(" ");
      expect(text).not.toMatch(/ends now|right away|immediately|deleted|delete/i);
      expect(text).not.toMatch(/[–—]/);
    }
  });
});

describe("remove preview", () => {
  it("on a paid plan: the business stays until the period end, then its scans stop", () => {
    const copy = remove(false);
    expect(copy.headline).toBe(`Bay Dental stays on your plan until ${DATE}. No refund.`);
    expect(copy.details).toEqual([
      "After that, scans for Bay Dental stop. Its results stay visible.",
      "Your next bill will be $149.",
      "Credits you already have stay until they expire.",
      `You can keep Bay Dental on your plan any time before ${DATE}.`,
    ]);
    expect(copy.losses).toEqual({ heading: `From ${DATE}, Bay Dental loses:`, items: LOST });
  });

  it("during a trial: nothing was paid, so no refund is mentioned", () => {
    const copy = remove(true);
    expect(copy.headline).toBe(`Bay Dental stays on your trial until ${DATE}. You won't be charged for it.`);
    expect([copy.headline, ...copy.details].join(" ")).not.toMatch(/refund/i);
  });
});
