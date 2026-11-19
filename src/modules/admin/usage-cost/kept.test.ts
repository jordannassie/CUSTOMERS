import { describe, expect, it } from "vitest";
import { keptOf, serviceCosts } from "./kept";
import { buildReport, type UsageRow } from "./service";

const row = (r: Partial<UsageRow>): UsageRow => ({ agencyId: "a1", usageType: "ai_visibility_check", provider: "openai", cached: false, costUsd: 0.01, createdAt: "2026-11-10", ...r });

describe("what we keep (owner, 2026-11-17)", () => {
  const usage = [
    row({ costUsd: 0.02, events: 2 }),
    row({ usageType: "google_places", provider: "google_places", costUsd: 0.06, events: 3 }),
    row({ usageType: "other", provider: "firecrawl", costUsd: 0.0076, events: 2 }),
  ];

  it("keeps Google Places and Firecrawl out of the AI totals and margins", () => {
    const report = buildReport({
      from: new Date("2026-11-01T00:00:00Z"),
      to: new Date("2026-11-17T00:00:00Z"),
      creditPriceUsd: 0.09,
      captures: [{ agencyId: "a1", provider: "openai", paid: true, credits: 2, createdAt: "2026-11-10" }],
      usage,
      agencies: new Map([["a1", { name: "Acme", isTest: false }]]),
    });
    expect(report.totals.costUsd).toBeCloseTo(0.02);
    expect(report.otherCostUsd).toBeCloseTo(0);
    expect(report.byAgency[0].costUsd).toBeCloseTo(0.02);
    expect(report.services).toEqual([
      { key: "google_places", label: "Google Places", costUsd: 0.06, calls: 3 },
      { key: "firecrawl", label: "Firecrawl website reads", costUsd: 0.0076, calls: 2 },
    ]);
  });

  it("is what Stripe collected, less its fees, the AI tools and the services", () => {
    const kept = keptOf({ cents: 29_800, feeCents: 894, charges: 2 }, 12.5, 3.25);
    expect(kept).toMatchObject({ state: "ok", collectedUsd: 298, stripeFeesUsd: 8.94, charges: 2 });
    if (kept.state !== "ok") throw new Error("expected ok");
    expect(kept.keptUsd).toBeCloseTo(298 - 8.94 - 12.5 - 3.25);
    expect(kept.margin).toBeCloseTo((298 - 8.94 - 12.5 - 3.25) / 298);
  });

  it("has no margin when nothing was collected, and shows a loss as negative", () => {
    const kept = keptOf({ cents: 0, feeCents: 0, charges: 0 }, 4, 1);
    expect(kept).toMatchObject({ state: "ok", keptUsd: -5, margin: null });
  });

  it("lists both services even when unused, so the card never jumps", () => {
    expect(serviceCosts([]).map((s) => [s.key, s.costUsd, s.calls])).toEqual([
      ["google_places", 0, 0],
      ["firecrawl", 0, 0],
    ]);
  });
});
