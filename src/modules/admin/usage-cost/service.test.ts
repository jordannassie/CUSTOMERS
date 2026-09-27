import { describe, expect, it } from "vitest";
import { buildReport, lowestCreditPrice, periodStart, verdictFor, type Capture, type UsageRow } from "./service";

const check = (provider: string, costUsd: number, cached = false, agencyId = "a1", createdAt = "2026-09-26T10:00:00Z"): UsageRow => ({
  agencyId,
  usageType: "ai_visibility_check",
  provider,
  cached,
  costUsd,
  createdAt,
});

describe("usage and cost rules (B-67)", () => {
  it("starts the period at UTC midnight so it includes today", () => {
    expect(periodStart(new Date("2026-09-27T15:30:00Z"), 7).toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });

  it("uses the cheapest active plan's credit price and ignores plans with no price", () => {
    const plans = [
      { priceCents: 14900, monthlyCredits: 1200 },
      { priceCents: 24900, monthlyCredits: 2500 },
      { priceCents: null, monthlyCredits: null },
    ];
    expect(lowestCreditPrice(plans)).toBeCloseTo(0.0996, 4);
    expect(lowestCreditPrice([])).toBeNull();
  });

  it.each([
    [0.7, "profitable"],
    [0.3, "thin"],
    [-0.1, "losing"],
    [null, "no_data"],
  ] as const)("calls a %s margin %s", (margin, verdict) => {
    expect(verdictFor(margin)).toBe(verdict);
  });

  it("splits credits and cost by day, model and agency, and counts cache hits", () => {
    const captures: Capture[] = [
      { agencyId: "a1", checkId: "c1", credits: 1, createdAt: "2026-09-26T10:00:00Z" },
      { agencyId: "a1", checkId: "c2", credits: 1, createdAt: "2026-09-26T10:00:00Z" },
      { agencyId: "a2", checkId: "c3", credits: 1, createdAt: "2026-09-27T09:00:00Z" },
    ];
    const usage: UsageRow[] = [
      check("openai", 0.03),
      check("openai", 0, true),
      check("anthropic", 0.2, false, "a2", "2026-09-27T09:00:00Z"),
      { agencyId: "a1", usageType: "other", provider: "anthropic", cached: false, costUsd: 0.002, createdAt: "2026-09-27T09:00:00Z" },
    ];
    const report = buildReport({
      from: new Date("2026-09-26T00:00:00Z"),
      to: new Date("2026-09-27T12:00:00Z"),
      creditPriceUsd: 0.1,
      captures,
      checkProvider: new Map([
        ["c1", "openai"],
        ["c2", "openai"],
        ["c3", "anthropic"],
      ]),
      usage,
      agencies: new Map([
        ["a1", { name: "North", isTest: false }],
        ["a2", { name: "South", isTest: true }],
      ]),
    });

    expect(report.totals).toMatchObject({ credits: 3, checks: 3, cached: 1 });
    expect(report.totals.costUsd).toBeCloseTo(0.232, 6);
    expect(report.totals.cacheHitRate).toBeCloseTo(1 / 3, 6);
    expect(report.byDay.map((d) => [d.day, d.credits])).toEqual([
      ["2026-09-26", 2],
      ["2026-09-27", 1],
    ]);

    const openai = report.byModel.find((m) => m.model === "openai")!;
    expect(openai).toMatchObject({ credits: 2, checks: 2, cached: 1, verdict: "profitable" });
    expect(openai.costPerCheck).toBeCloseTo(0.015, 6);
    expect(openai.costPerCall).toBeCloseTo(0.03, 6);
    expect(openai.margin).toBeCloseTo(0.85, 6);
    expect(report.byModel.find((m) => m.model === "anthropic")).toMatchObject({ credits: 1, verdict: "losing" });
    expect(report.byModel.find((m) => m.model === "perplexity")).toMatchObject({ checks: 0, verdict: "no_data", margin: null });
    expect(report.otherCostUsd).toBeCloseTo(0.002, 6);

    expect(report.byAgency.map((a) => [a.name, a.credits, a.isTest])).toEqual([
      ["North", 2, false],
      ["South", 1, true],
    ]);
    expect(report.byAgency[1].margin).toBeCloseTo(-1, 6);
  });
});
