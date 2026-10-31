// Live smoke check for the Claude adapter (B-21): "best coffee shop near me" from Orange, CA should
// list real Orange coffee shops. Makes one real paid call (about $0.02 to $0.05), so it only runs with
// LIVE_AI_CALL=1:
//   LIVE_AI_CALL=1 npm run dev:anthropic-check
// The key comes from ANTHROPIC_API_KEY in the shell, or else .env.local.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";
import { createAnthropicCheck } from "@/modules/scanning/providers/anthropic";
import { CHECK_MODELS } from "@/modules/scanning/providers/models";

const live = process.env.LIVE_AI_CALL === "1";

function apiKey(): string {
  const fromFile = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")).ANTHROPIC_API_KEY : undefined;
  const key = process.env.ANTHROPIC_API_KEY || fromFile;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set in the shell or .env.local");
  return key;
}

it.runIf(live)("best coffee shop near me, Orange CA", { timeout: 120_000 }, async () => {
  const run = createAnthropicCheck(apiKey());
  const result = await run({
    question: "What is the best coffee shop near me in Orange, CA?",
    location: { city: "Orange", region: "California", country: "US" },
    model: CHECK_MODELS.anthropic,
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
