import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { dispatchEvent, type WebhookDeps } from "./handlers";

// One-time video ads from /ads (merged from main): both checkout events save the order and never reach the
// agency, credits or plans. The store and Stripe reader throw on any use, so a billing write fails the test.

function untouchable<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get: (_target, key) => () => {
      throw new Error(`video ad event used ${name}.${String(key)}`);
    },
  });
}

function deps(recorded: Stripe.Checkout.Session[], withRecorder = true): WebhookDeps {
  return {
    store: untouchable("store"),
    stripe: untouchable("stripe"),
    sendEmail: () => {
      throw new Error("video ad event sent a billing email");
    },
    now: () => new Date(),
    recordVideoAd: withRecorder
      ? async (session) => {
          recorded.push(session);
        }
      : undefined,
  };
}

// Payment mode with an agency id and top-up style metadata, so only the video ad check keeps it from billing.
function videoAdSession(paymentStatus: "paid" | "unpaid" = "paid") {
  return fx.checkoutSession({
    mode: "payment",
    customer: fx.id("cus"),
    agencyId: "00000000-0000-4000-8000-000000000000",
    paymentStatus,
    metadata: { kind: "video_ad", package_id: "starter", credits: "500" },
  });
}

describe("video ad checkout events", () => {
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"] as const)(
    "%s records the order and touches no credits or plans",
    async (type) => {
      const recorded: Stripe.Checkout.Session[] = [];
      const session = videoAdSession();
      await expect(dispatchEvent(deps(recorded), fx.event(type, session))).resolves.toBe("handled");
      expect(recorded.map((s) => s.id)).toEqual([session.id]);
    },
  );

  it("is ignored, still without billing changes, when no recorder is set", async () => {
    const recorded: Stripe.Checkout.Session[] = [];
    const event = fx.event("checkout.session.completed", videoAdSession());
    await expect(dispatchEvent(deps(recorded, false), event)).resolves.toBe("ignored");
    expect(recorded).toEqual([]);
  });

  it("still sends a top-up session to billing", async () => {
    const session = fx.checkoutSession({
      mode: "payment",
      customer: fx.id("cus"),
      agencyId: "00000000-0000-4000-8000-000000000000",
      metadata: { kind: "topup", credits: "500" },
    });
    await expect(dispatchEvent(deps([]), fx.event("checkout.session.completed", session))).rejects.toThrow(/used store\./);
  });
});
