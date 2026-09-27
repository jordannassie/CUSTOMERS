import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createScanAgency, createScanBusiness, deleteScanUsers, service } from "../service.test-helpers";
import { loadScoreReport } from "./dal";

// B-30 step 2: the 30-day aggregates read from saved checks on the local database.
afterAll(deleteScanUsers);

const NOW = new Date();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("loadScoreReport", () => {
  it("scores the business's last 30 days of checks and hides other agencies' businesses", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const { data: prompts } = await service
      .from("tracked_prompts")
      .select("id")
      .eq("business_id", business.businessId)
      .order("created_at")
      .throwOnError();
    const { data: run } = await service
      .from("visibility_runs")
      .insert({
        business_id: business.businessId,
        provider: "scan",
        status: "completed",
      })
      .select("id")
      .single()
      .throwOnError();
    const row = (
      provider: string,
      promptId: string,
      at: string,
      mentioned: boolean,
      rival = false,
      cached = false,
    ) => ({
      id: randomUUID(),
      run_id: run.id,
      business_id: business.businessId,
      tracked_prompt_id: promptId,
      provider,
      created_at: at,
      business_mentioned: mentioned,
      competitors_mentioned: rival ? [{ name: "Rival Roasters", position: 2 }] : [],
      cached,
    });
    const [q1, q2] = prompts.map((p) => p.id);
    await service
      .from("visibility_results")
      .insert([
        row("openai", q1, hoursAgo(2), true, true),
        row("openai", q1, hoursAgo(1), true, true, true),
        row("openai", q2, hoursAgo(2), false),
        row("openai", q2, hoursAgo(1), true, false, true),
        row("anthropic", q1, hoursAgo(2), false, true),
        row("anthropic", q2, hoursAgo(2), false),
        // Outside the 30-day window.
        row("anthropic", q1, hoursAgo(31 * 24), true),
      ])
      .throwOnError();

    const report = await loadScoreReport(agency.agencyId, business.businessId, NOW);
    expect(report?.byModel.map((m) => [m.model, m.estimate.score, m.estimate.checks])).toEqual([
      ["openai", 75, 4],
      ["anthropic", 0, 2],
    ]);
    expect(report?.overall).toMatchObject({
      score: 37.5,
      checks: 6,
      uniqueAnswers: 4,
      confidence: "early",
    });
    expect(report?.competitors).toEqual([{ name: "Rival Roasters", score: 50, standing: "about_same" }]);
    expect(report?.questions.slice(0, 2).map((q) => [q.appeared, q.checks])).toEqual([
      [2, 3],
      [1, 3],
    ]);
    expect(report?.trend).toHaveLength(7);

    const other = await createScanAgency({ isTest: true, credits: 0 });
    expect(await loadScoreReport(other.agencyId, business.businessId, NOW)).toBeNull();
  });
});
