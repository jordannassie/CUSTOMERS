import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgencyWithBusiness, deleteTestUsers, service } from "../admin.test-helpers";
import { loadUsageCost } from "./dal";

// Seeds a random past week that no other test writes to, so the page's totals can be compared with the raw
// tables exactly while other test files run at the same time. A fresh week per run keeps rows left by an
// interrupted run out of this run's report.
const DAY = 86_400_000;
const START = Date.UTC(2020, 2, 1) - Math.floor(Math.random() * 2000) * 7 * DAY;
const at = (days: number, time: string) => `${new Date(START + days * DAY).toISOString().slice(0, 10)}T${time}Z`;
const FROM = new Date(START).toISOString();
const NOW = new Date(at(6, "12:00:00"));
const ledgerIds: string[] = [];
let seeded: Awaited<ReturnType<typeof createAgencyWithBusiness>>;

beforeAll(async () => {
  seeded = await createAgencyWithBusiness("Ledger test");
  const { data: run, error } = await service
    .from("visibility_runs")
    .insert({ business_id: seeded.businessId, provider: "openai,anthropic,perplexity", status: "completed", started_at: FROM })
    .select("id")
    .single();
  if (error) throw error;

  const checks = [
    { provider: "openai", cost: 0.03, cached: false, at: at(1, "10:00:00") },
    { provider: "openai", cost: 0, cached: true, at: at(1, "10:05:00") },
    { provider: "anthropic", cost: 0.05, cached: false, at: at(4, "09:00:00") },
    { provider: "perplexity", cost: 0.008, cached: false, at: at(6, "08:00:00") },
  ];
  for (const c of checks) {
    const { data: result, error: resultError } = await service
      .from("visibility_results")
      .insert({ run_id: run.id, business_id: seeded.businessId, provider: c.provider, cached: c.cached, cost_usd: c.cost })
      .select("id")
      .single();
    if (resultError) throw resultError;
    // Written directly with a fixed date; capture_credit always stamps now().
    const { data: tx, error: txError } = await service
      .from("credit_transactions")
      .insert({ agency_id: seeded.agencyId, delta: -1, kind: "capture", source_type: "vitest_check", source_id: result.id, created_at: c.at })
      .select("id")
      .single();
    if (txError) throw txError;
    ledgerIds.push(tx.id);
    const usage = await service.from("usage_events").insert({
      account_user_id: seeded.ownerId,
      business_id: seeded.businessId,
      usage_type: "ai_visibility_check",
      provider: c.provider,
      cached: c.cached,
      estimated_cost_usd: c.cost,
      created_at: c.at,
    });
    if (usage.error) throw usage.error;
  }
  // Name extraction: our cost only, no credit.
  const extraction = await service.from("usage_events").insert({
    account_user_id: seeded.ownerId,
    business_id: seeded.businessId,
    usage_type: "other",
    provider: "anthropic",
    estimated_cost_usd: 0.0014,
    created_at: at(4, "09:00:01"),
  });
  if (extraction.error) throw extraction.error;
});

afterAll(async () => {
  await service.from("credit_transactions").delete().in("id", ledgerIds);
  await deleteTestUsers();
});

async function rawTotals(agencyId?: string) {
  let credits = service.from("credit_transactions").select("delta, created_at").eq("kind", "capture").gte("created_at", FROM).lte("created_at", NOW.toISOString());
  if (agencyId) credits = credits.eq("agency_id", agencyId);
  let usage = service.from("usage_events").select("estimated_cost_usd, usage_type, cached, provider").gte("created_at", FROM).lte("created_at", NOW.toISOString());
  if (agencyId) usage = usage.eq("account_user_id", seeded.ownerId);
  const [c, u] = await Promise.all([credits, usage]);
  if (c.error || u.error) throw c.error ?? u.error;
  const checkRows = u.data.filter((r) => r.usage_type === "ai_visibility_check");
  return {
    credits: -c.data.reduce((s, r) => s + r.delta, 0),
    costUsd: u.data.reduce((s, r) => s + Number(r.estimated_cost_usd), 0),
    checks: checkRows.length,
    cached: checkRows.filter((r) => r.cached).length,
  };
}

describe("admin Usage & Cost numbers (B-67)", () => {
  it("match usage_events and credit_transactions for the period", async () => {
    const report = await loadUsageCost({ days: 7, includeTest: true }, NOW);
    const raw = await rawTotals();

    expect(report.from).toBe(FROM);
    expect(report.totals.credits).toBe(raw.credits);
    expect(report.totals.costUsd).toBeCloseTo(raw.costUsd, 6);
    expect(report.totals.checks).toBe(raw.checks);
    expect(report.totals.cached).toBe(raw.cached);
    expect(report.byDay.reduce((s, d) => s + d.credits, 0)).toBe(raw.credits);
    expect(report.byDay.reduce((s, d) => s + d.costUsd, 0)).toBeCloseTo(raw.costUsd, 6);
    expect(report.byModel.reduce((s, m) => s + m.credits, 0)).toBe(raw.credits);

    // And the seeded figures themselves.
    expect(await rawTotals(seeded.agencyId)).toEqual({ credits: 4, costUsd: expect.closeTo(0.0894, 6), checks: 4, cached: 1 });
    expect(report.byDay.find((d) => d.day === at(1, "00:00:00").slice(0, 10))).toMatchObject({ credits: 2, costUsd: 0.03 });
    expect(report.byModel.map((m) => [m.model, m.credits, m.checks, m.cached])).toEqual([
      ["openai", 2, 2, 1],
      ["anthropic", 1, 1, 0],
      ["perplexity", 1, 1, 0],
    ]);
    expect(report.byModel[0].costPerCheck).toBeCloseTo(0.015, 6);
    expect(report.byModel[0].costPerCall).toBeCloseTo(0.03, 6);
    expect(report.otherCostUsd).toBeCloseTo(0.0014, 6);
    expect(report.totals.cacheHitRate).toBeCloseTo(0.25, 6);

    const agencyRow = report.byAgency.find((a) => a.id === seeded.agencyId)!;
    const agencyRaw = await rawTotals(seeded.agencyId);
    expect(agencyRow).toMatchObject({ name: "Ledger test", isTest: true, credits: agencyRaw.credits });
    expect(agencyRow.costUsd).toBeCloseTo(agencyRaw.costUsd, 6);
  });

  it("leaves test agencies out unless asked", async () => {
    const report = await loadUsageCost({ days: 7, includeTest: false }, NOW);
    expect(report.byAgency.find((a) => a.id === seeded.agencyId)).toBeUndefined();
    expect(report.totals.credits).toBe(0);
  });

  it("prices a credit at the cheapest active plan", async () => {
    const report = await loadUsageCost({ days: 7, includeTest: true }, NOW);
    const { data } = await service.from("plans").select("price_cents, monthly_credits").eq("active", true);
    const cheapest = Math.min(...data!.filter((p) => p.price_cents && p.monthly_credits).map((p) => p.price_cents! / 100 / p.monthly_credits!));
    expect(report.creditPriceUsd).toBeCloseTo(cheapest, 8);
  });
});
