import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBalance } from "@/modules/credits";
import seed from "../../../tests/fixtures/test-agency.json";
import { createNameExtractor } from "./extract";
import { createAnthropicCheck } from "./providers/anthropic";
import { createOpenAICheck } from "./providers/openai";
import { createPerplexityCheck } from "./providers/perplexity";
import type { ProviderId } from "./providers/types";
import { loadRecordedAnswers } from "./recorded";
import { runScan } from "./service";
import { blockAiHosts, createScanAgency, deleteScanUsers, finishJob, newJob, service } from "./service.test-helpers";

// B-31 engineering check: a test agency scan makes zero calls to OpenAI, Anthropic or Perplexity.
// The real adapters get fake keys, so a scan that skipped test mode would reach the blocked hosts.
afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const noWait = { sleep: async () => {} };
const ADAPTERS = { openai: createOpenAICheck, anthropic: createAnthropicCheck, perplexity: createPerplexityCheck };
const liveWithFakeKeys = {
  checkRunner: (p: ProviderId) => ADAPTERS[p]("fake-key", noWait),
  extractNames: createNameExtractor("fake-key", noWait),
};

async function seedBusiness(agency: { agencyId: string; ownerUserId: string }, b: (typeof seed.businesses)[number]) {
  const { data, error } = await service
    .from("businesses")
    .insert({
      owner_user_id: agency.ownerUserId,
      agency_id: agency.agencyId,
      name: b.name,
      industry: b.industry,
      domain: b.domain,
      primary_city: b.city,
      primary_region: b.region,
      primary_country: b.country,
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single();
  if (error) throw error;
  await service.from("tracked_prompts").insert(b.questions.map((prompt) => ({ business_id: data.id, prompt })));
  await service.from("business_competitors").insert(b.competitors.map((c) => ({ business_id: data.id, ...c, city: b.city })));
  return { agencyId: agency.agencyId, businessId: data.id, city: b.city, questions: b.questions };
}

describe("test mode (B-31, D-61)", () => {
  it("runs the seed agency's scans on recorded answers with no AI calls and no AI cost", async () => {
    const agency = await createScanAgency({ isTest: true, credits: seed.credits });
    const recorded = await loadRecordedAnswers();

    for (const b of seed.businesses) {
      const business = await seedBusiness(agency, b);
      const job = await newJob(business);

      const outcome = await runScan(job, liveWithFakeKeys);
      await finishJob(job);

      expect(outcome).toMatchObject({ status: "done", checks: 9, failed: 0, charged: 9 });
      const { data: rows } = await service
        .from("visibility_results")
        .select("provider, question, answer_text, business_mentioned, cost_usd, cached, extracted_names")
        .eq("business_id", business.businessId);
      expect(rows).toHaveLength(9);
      for (const row of rows!) {
        const exact = recorded.find((a) => a.provider === row.provider && a.question === row.question);
        if (exact) expect(row.answer_text).toBe(exact.answerText);
        expect(Number(row.cost_usd)).toBe(0);
        expect(row.cached).toBe(false);
        expect(row.extracted_names).not.toBeNull();
      }
      // The recorded answers name the business for some models and not others, so scores are not flat.
      expect(rows!.some((r) => r.business_mentioned)).toBe(true);
      expect(rows!.some((r) => !r.business_mentioned)).toBe(true);
    }

    expect(aiAttempts).toEqual([]);
    expect((await getBalance(agency.agencyId)).balance).toBe(seed.credits - 18);
    const { count } = await service
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("account_user_id", agency.ownerUserId);
    expect(count).toBe(0);
  });

  it("control: the same scan for a normal agency tries every host and is blocked, so nothing is charged", async () => {
    const agency = await createScanAgency({ credits: 10 });
    const business = await seedBusiness(agency, { ...seed.businesses[0], questions: seed.businesses[0].questions.slice(0, 1) });
    const job = await newJob(business);

    const outcome = await runScan(job, liveWithFakeKeys);
    await finishJob(job);

    expect(outcome).toMatchObject({ status: "failed", checks: 3, failed: 3, charged: 0 });
    const hosts = new Set(aiAttempts.map((url) => new URL(url).hostname));
    expect([...hosts].sort()).toEqual(["api.anthropic.com", "api.openai.com", "api.perplexity.ai"]);
    expect((await getBalance(agency.agencyId)).balance).toBe(10);
  });
});
