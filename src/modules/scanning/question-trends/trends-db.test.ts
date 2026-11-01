import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createScanAgency, createScanBusiness, deleteScanUsers, service } from "../service.test-helpers";
import { loadQuestionTrends } from "./dal";

// Up or down per question against the local database: saved checks of finished scans only, paused questions hidden,
// own questions apart, and only the agency's own business.
afterAll(deleteScanUsers);

const NOW = new Date();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

async function scan(businessId: string, at: string, status: string, named: Record<string, string[]>) {
  const { data: run } = await service.from("visibility_runs").insert({ business_id: businessId, provider: "openai,anthropic,perplexity", status, started_at: at, created_at: at }).select("id").single().throwOnError();
  const rows = Object.entries(named).flatMap(([promptId, providers]) =>
    ["openai", "anthropic", "perplexity"].map((provider) => ({
      id: randomUUID(),
      run_id: run.id,
      business_id: businessId,
      tracked_prompt_id: promptId,
      provider,
      created_at: at,
      business_mentioned: providers.includes(provider),
      competitors_mentioned: [],
      answer_text: "Saved answer",
    })),
  );
  if (rows.length) await service.from("visibility_results").insert(rows).throwOnError();
}

describe("loadQuestionTrends", () => {
  it("reads finished weekly scans for active questions, own questions apart", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const { data: prompts } = await service.from("tracked_prompts").select("id").eq("business_id", business.businessId).order("created_at").order("id").throwOnError();
    const [first, second, paused] = prompts.map((p) => p.id);
    const { data: own } = await service.from("tracked_prompts").insert({ business_id: business.businessId, prompt: "Who roasts on site in town?", source: "custom" }).select("id").single().throwOnError();
    await service.from("tracked_prompts").update({ active: false }).eq("id", paused).throwOnError();

    await scan(business.businessId, daysAgo(14), "completed", { [first]: [], [second]: ["openai", "anthropic"], [paused]: ["openai"] });
    await scan(business.businessId, daysAgo(7), "completed", { [first]: ["openai"], [second]: ["openai"], [own.id]: ["perplexity"] });
    // Still running: not shown.
    await scan(business.businessId, daysAgo(0), "running", { [first]: ["openai", "anthropic", "perplexity"] });

    const trends = await loadQuestionTrends(agency.agencyId, business.businessId, NOW);
    expect(trends?.scans).toHaveLength(2);
    expect(trends?.rows).toHaveLength(11);
    expect(trends?.rows.find((r) => r.id === paused)).toBeUndefined();
    expect(trends?.rows.find((r) => r.id === first)?.cells).toEqual([
      { named: 0, checked: 3, change: null },
      { named: 1, checked: 3, change: "up" },
    ]);
    expect(trends?.own.map((r) => [r.id, r.cells])).toEqual([[own.id, [null, { named: 1, checked: 3, change: null }]]]);
    expect(trends?.better.map((m) => m.id)).toEqual([first]);
    expect(trends?.worse.map((m) => m.id)).toEqual([second]);

    const other = await createScanAgency({ isTest: true, credits: 0 });
    expect(await loadQuestionTrends(other.agencyId, business.businessId, NOW)).toBeNull();
  });
});
