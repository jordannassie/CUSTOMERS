import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { CACHE_TTL_MS, cacheKey, checkWithCache, normaliseText, recordCheckUsage } from "./cache";
import type { CheckInput, CheckResult, RunCheck } from "./providers/types";

// B-23: the answer cache against the local database. The model call is a stub; no real AI calls.
const service = createServiceClient();
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

const ORANGE = { city: "Orange", region: "CA", country: "US" };

function question(): CheckInput {
  return { question: `What is the best dentist in Orange? ${randomUUID()}`, location: ORANGE, model: "gpt-4.1-mini" };
}

function stubRun(answerText = "Try Orange Smiles Dental."): RunCheck & ReturnType<typeof vi.fn> {
  const result: CheckResult = {
    answerText,
    citations: [{ url: "https://orangesmiles.example/", title: "Orange Smiles" }],
    model: "gpt-4.1-mini-2025-04-14",
    usage: { inputTokens: 1200, cachedInputTokens: 0, outputTokens: 300, searchCalls: 1 },
    costUsd: 0.01096,
    latencyMs: 2400,
  };
  return vi.fn(async () => result);
}

async function ageEntry(input: CheckInput, ms: number) {
  const { error } = await service
    .from("ai_answer_cache")
    .update({ created_at: new Date(Date.now() - ms).toISOString() })
    .eq("cache_key", cacheKey(input));
  if (error) throw error;
}

describe("cache key", () => {
  it("ignores case, extra spaces and punctuation", () => {
    expect(normaliseText("  What's the BEST dentist,  in Orange?? ")).toBe("what s the best dentist in orange");
    const input = question();
    expect(cacheKey({ ...input, question: `  ${input.question.toUpperCase()}!! ` })).toBe(cacheKey(input));
  });

  it("differs by model, city, region and country", () => {
    const input = question();
    const keys = new Set([
      cacheKey(input),
      cacheKey({ ...input, model: "claude-haiku-4-5" }),
      cacheKey({ ...input, location: { ...ORANGE, city: "Irvine" } }),
      cacheKey({ ...input, location: { ...ORANGE, region: "TX" } }),
      cacheKey({ ...input, location: { ...ORANGE, country: "CA" } }),
    ]);
    expect(keys.size).toBe(5);
  });
});

describe("answer cache (B-23)", () => {
  it("two businesses in the same city asking the same question within a day share one AI call", async () => {
    const input = question();
    const run = stubRun();

    const first = await checkWithCache(input, run);
    const second = await checkWithCache({ ...input, question: `${input.question}?` }, run);

    expect(run).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({ cached: false, costUsd: 0.01096 });
    expect(second).toMatchObject({
      cached: true,
      costUsd: 0,
      usage: null,
      answerText: first.answerText,
      citations: first.citations,
      model: "gpt-4.1-mini-2025-04-14",
      extractedNames: null,
    });
  });

  it("hits just inside 24 hours", async () => {
    const input = question();
    const run = stubRun();
    await checkWithCache(input, run);
    await ageEntry(input, CACHE_TTL_MS - 60_000);

    expect((await checkWithCache(input, run)).cached).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("misses after 24 hours and replaces the old answer", async () => {
    const input = question();
    await checkWithCache(input, stubRun("Old answer."));
    await ageEntry(input, CACHE_TTL_MS + 60_000);

    const run = stubRun("New answer.");
    const fresh = await checkWithCache(input, run);
    expect(run).toHaveBeenCalledTimes(1);
    expect(fresh).toMatchObject({ cached: false, answerText: "New answer." });
    expect(await checkWithCache(input, run)).toMatchObject({ cached: true, answerText: "New answer." });
  });

  it("misses for a different city", async () => {
    const input = question();
    const run = stubRun();
    await checkWithCache(input, run);

    const irvine = await checkWithCache({ ...input, location: { ...ORANGE, city: "Irvine" } }, run);
    expect(irvine.cached).toBe(false);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("records cost 0 and cached = true in usage_events on a hit, the real cost on a call", async () => {
    const { data: user, error } = await service.auth.admin.createUser({
      email: `vitest-cache-${randomUUID()}@example.test`,
      email_confirm: true,
    });
    if (error || !user.user) throw error ?? new Error("no user");
    userIds.push(user.user.id);

    const input = question();
    const run = stubRun();
    for (let i = 0; i < 2; i++) {
      const answer = await checkWithCache(input, run);
      await recordCheckUsage({ accountUserId: user.user.id, businessId: null, input, answer });
    }

    const { data: rows } = await service
      .from("usage_events")
      .select("provider, estimated_cost_usd, cached, request_count, input_tokens")
      .eq("account_user_id", user.user.id)
      .order("created_at");
    expect(rows).toEqual([
      { provider: "openai", estimated_cost_usd: 0.01096, cached: false, request_count: 1, input_tokens: 1200 },
      { provider: "openai", estimated_cost_usd: 0, cached: true, request_count: 0, input_tokens: null },
    ]);
  });
});
