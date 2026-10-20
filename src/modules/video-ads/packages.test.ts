import { describe, expect, it } from "vitest";
import { matchPaidPackage, VIDEO_AD_PACKAGES } from "./packages";
import { PORTFOLIO_VIDEOS } from "./portfolio";
import { briefSchema, normalizeHttpUrl } from "./schema";

const paid = {
  mode: "payment",
  paymentStatus: "paid",
  currency: "usd",
  kind: "video_ad",
} as const;

describe("video ad packages", () => {
  it("prices the three one-time packages on the server", () => {
    expect(VIDEO_AD_PACKAGES.map((pack) => [pack.id, pack.amountCents])).toEqual([
      ["starter", 9900],
      ["growth", 29700],
      ["scale", 49500],
    ]);
  });

  it("rejects a paid session whose amount does not match the catalog", () => {
    expect(matchPaidPackage({ ...paid, amountTotal: 100, packageId: "starter" })).toBeNull();
    expect(matchPaidPackage({ ...paid, amountTotal: 9900, packageId: "nope" })).toBeNull();
    expect(matchPaidPackage({ ...paid, amountTotal: 9900, packageId: "starter", mode: "subscription" })).toBeNull();
    expect(matchPaidPackage({ ...paid, amountTotal: 9900, packageId: "starter", paymentStatus: "unpaid" })).toBeNull();
  });

  it("accepts only the catalog amount for that package", () => {
    expect(matchPaidPackage({ ...paid, amountTotal: 29700, packageId: "growth" })?.id).toBe("growth");
  });

  it("fills a 4 by 4 reel wall with the one real sample", () => {
    expect(PORTFOLIO_VIDEOS).toHaveLength(16);
    expect(new Set(PORTFOLIO_VIDEOS.map((video) => video.src)).size).toBe(1);
  });
});

describe("video ad brief", () => {
  it("normalizes website addresses and rejects other protocols", () => {
    expect(normalizeHttpUrl("brand.example")).toBe("https://brand.example/");
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("")).toBeNull();
  });

  it("requires a real checkout session id", () => {
    const parsed = briefSchema.safeParse({
      sessionId: "cs_test_abc123",
      token: "a".repeat(32),
      customerName: "Ada Lovelace",
      email: "ada@brand.example",
      businessName: "Ada Co",
      websiteUrl: "https://brand.example",
      product: "Hand soap",
      audience: "Parents",
      creativeInstructions: "Show the bottle in a bright kitchen.",
    });
    expect(parsed.success).toBe(true);
    expect(briefSchema.safeParse({ sessionId: "price_123" }).success).toBe(false);
  });
});
