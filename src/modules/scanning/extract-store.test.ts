import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { cacheKey, checkWithCache, readCachedAnswer } from "./cache";
import { createNameExtractor, readStoredExtraction } from "./extract";
import { storeExtraction } from "./extract-store";
import recorded from "./fixtures/extract-names-message.json";
import type { CheckInput, RunCheck } from "./providers/types";

// B-25 against the local database: extracted names are stored with the cached answer, so a cache
// hit reuses them without a new AI call. Both model calls are stubs; no real AI calls.
const ANSWER = "1. **Contra Coffee & Tea**\n2. **Portola Coffee Roasters**\n3. **Kaffee Meister**";

describe("storeExtraction", () => {
  it("saves the names on the cached answer and a later cache hit returns them", async () => {
    const input: CheckInput = {
      question: `What is the best coffee shop in Orange? ${randomUUID()}`,
      location: { city: "Orange", region: "CA", country: "US" },
      model: "claude-haiku-4-5",
    };
    const run: RunCheck = async () => ({
      answerText: ANSWER,
      citations: [],
      model: "claude-haiku-4-5-20251001",
      usage: { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 200, searchCalls: 1 },
      costUsd: 0.012,
      latencyMs: 2000,
    });
    const first = await checkWithCache(input, run);
    expect(first.extractedNames).toBeNull();

    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(recorded));
    const extraction = await createNameExtractor("sk-ant-test", { fetch })(first.answerText);
    await storeExtraction(cacheKey(input), extraction);

    const hit = await readCachedAnswer(input);
    expect(hit?.cached).toBe(true);
    expect(readStoredExtraction(hit?.extractedNames)?.names).toEqual(extraction.names);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
