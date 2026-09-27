// Records real check answers into tests/fixtures/ai-answers/ for test mode (B-31, D-61): 8 questions for
// each of 3 industries in 2 cities, on all three check models (48 answers per model, 144 in total).
// Every answer is a real paid call (a few dollars in total), so it only runs with LIVE_AI_CALL=1, and only
// after the AI keys are rotated (B-01):
//   LIVE_AI_CALL=1 npm run record:ai-answers
// Keys come from the shell, or else .env.local. Answers already recorded are skipped, so a stopped run
// resumes; the synthetic placeholders are removed once every answer is recorded.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";
import { createNameExtractor } from "@/modules/scanning/extract";
import { createAnthropicCheck } from "@/modules/scanning/providers/anthropic";
import { CHECK_MODELS } from "@/modules/scanning/providers/models";
import { createOpenAICheck } from "@/modules/scanning/providers/openai";
import { createPerplexityCheck } from "@/modules/scanning/providers/perplexity";
import type { CheckLocation, ProviderId, RunCheck } from "@/modules/scanning/providers/types";

const live = process.env.LIVE_AI_CALL === "1";
const DIR = path.join(process.cwd(), "tests", "fixtures", "ai-answers");
const AT_ONCE = 3;

const CITIES: (CheckLocation & { slug: string })[] = [
  { slug: "orange-ca", city: "Orange", region: "CA", country: "US" },
  { slug: "austin-tx", city: "Austin", region: "TX", country: "US" },
];

// The same kinds of question a business tracks: best, urgent, price, reviews, comparison.
const QUESTIONS: Record<string, string[]> = {
  coffee: [
    "What is the best coffee shop in {city}?",
    "Where can I find a quiet cafe to work from in {city}?",
    "Which coffee shop in {city} has the best cold brew?",
    "Where can I get a good cheap coffee in {city}?",
    "Which cafe in {city} has the best reviews?",
    "What coffee shop in {city} is open early in the morning?",
    "Where can I get a good latte near downtown {city}?",
    "What is a good local alternative to Starbucks in {city}?",
  ],
  dentist: [
    "Who is the best dentist in {city}?",
    "Where can I find an emergency dentist open today in {city}?",
    "Which dentist in {city} is good with nervous patients?",
    "How much does a dental cleaning cost in {city}, and who is affordable?",
    "Which dentist in {city} has the best reviews?",
    "Who is a good family dentist for kids in {city}?",
    "Where can I get teeth whitening in {city}?",
    "Which dental office in {city} takes new patients this week?",
  ],
  plumber: [
    "Who is the best plumber in {city}?",
    "Which plumber in {city} can fix a leak today?",
    "Who offers 24 hour emergency plumbing in {city}?",
    "How much does a plumber cost in {city}, and who is fairly priced?",
    "Which plumbing company in {city} has the best reviews?",
    "Who can replace a water heater in {city}?",
    "Which plumber in {city} is good for clogged drains?",
    "Who is a reliable licensed plumber near downtown {city}?",
  ],
};

function key(name: string): string {
  const fromFile = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8"))[name] : undefined;
  const value = process.env[name] || fromFile;
  if (!value) throw new Error(`${name} is not set in the shell or .env.local`);
  return value;
}

type Job = { file: string; provider: ProviderId; question: string; location: CheckLocation };

function jobs(): Job[] {
  return CITIES.flatMap((location) =>
    Object.entries(QUESTIONS).flatMap(([industry, templates]) =>
      templates.flatMap((template, i) =>
        (Object.keys(CHECK_MODELS) as ProviderId[]).map((provider) => ({
          file: `recorded-${provider}-${industry}-${location.slug}-${i + 1}.json`,
          provider,
          question: template.replace("{city}", `${location.city}, ${location.region}`),
          location,
        })),
      ),
    ),
  );
}

it.runIf(live)("record real answers for test mode", { timeout: 60 * 60_000 }, async () => {
  const runners: Record<ProviderId, RunCheck> = {
    openai: createOpenAICheck(key("OPENAI_API_KEY")),
    anthropic: createAnthropicCheck(key("ANTHROPIC_API_KEY")),
    perplexity: createPerplexityCheck(key("PERPLEXITY_API_KEY")),
  };
  const extractNames = createNameExtractor(key("ANTHROPIC_API_KEY"));
  const todo = jobs().filter((job) => !existsSync(path.join(DIR, job.file)));
  const failures: string[] = [];
  let spentUsd = 0;
  console.log(`${todo.length} answers to record`);

  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const job = todo[next++];
      try {
        const result = await runners[job.provider]({
          question: job.question,
          location: job.location,
          model: CHECK_MODELS[job.provider],
        });
        const extraction = await extractNames(result.answerText);
        spentUsd += result.costUsd + extraction.costUsd;
        const answer = {
          synthetic: false,
          provider: job.provider,
          model: result.model,
          recordedAt: new Date().toISOString(),
          question: job.question,
          answerText: result.answerText,
          citations: result.citations,
          names: extraction.names.map((n) => n.name),
        };
        writeFileSync(path.join(DIR, job.file), `${JSON.stringify(answer, null, 2)}\n`);
        console.log(`recorded ${job.file}`);
      } catch (err) {
        failures.push(`${job.file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));

  console.log(`Spent about $${spentUsd.toFixed(2)}`);
  expect(failures).toEqual([]);
  for (const file of readdirSync(DIR).filter((f) => f.startsWith("synthetic-"))) rmSync(path.join(DIR, file));
  console.log("Removed the synthetic placeholders. Read through the names in the new files before committing.");
});

it.skipIf(live)("skipped: set LIVE_AI_CALL=1 (and rotate the AI keys first, B-01) to make the real calls", () => {});
