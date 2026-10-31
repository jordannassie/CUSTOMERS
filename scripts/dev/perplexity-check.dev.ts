// Live smoke check for the Perplexity adapter (B-22): "best coffee shop near me" from Orange, CA should
// list real Orange coffee shops. Makes one real paid call (under $0.01), so it only runs with
// LIVE_AI_CALL=1:
//   LIVE_AI_CALL=1 npm run dev:perplexity-check
// The key comes from PERPLEXITY_API_KEY in the shell, or else .env.local.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";
import { createPerplexityCheck } from "@/modules/scanning/providers/perplexity";
import { CHECK_MODELS } from "@/modules/scanning/providers/models";

const live = process.env.LIVE_AI_CALL === "1";

function apiKey(): string {
  const fromFile = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")).PERPLEXITY_API_KEY : undefined;
  const key = process.env.PERPLEXITY_API_KEY || fromFile;
  if (!key) throw new Error("PERPLEXITY_API_KEY is not set in the shell or .env.local");
  return key;
}

it.runIf(live)("best coffee shop near me, Orange CA", { timeout: 120_000 }, async () => {
  const run = createPerplexityCheck(apiKey());
  const result = await run({
    question: "What is the best coffee shop near me in Orange, CA?",
    location: { city: "Orange", region: "California", country: "US" },
    model: CHECK_MODELS.perplexity,
  });

  console.log(`\nModel: ${result.model}  Latency: ${result.latencyMs} ms`);
  console.log(`Usage: ${JSON.stringify(result.usage)}`);
  console.log(`Cost: $${result.costUsd.toFixed(6)}\n`);
  console.log(result.answerText);
  console.log("\nCitations:");
  for (const c of result.citations) console.log(`- ${c.title ?? "(no title)"}: ${c.url}`);

  expect(result.usage.searchCalls).toBeGreaterThan(0);
  expect(result.answerText).toMatch(/Orange/);
});

it.skipIf(live)("skipped: set LIVE_AI_CALL=1 to make the real call", () => {});
