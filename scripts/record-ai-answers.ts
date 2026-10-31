// Records real check answers into tests/fixtures/ai-answers/ for test mode (B-31, D-61). Two sets:
//   base (default): 8 questions for each of 3 industries in 2 cities, on all three check models (144 answers).
//   food: restaurant and coffee shop questions in Islamabad, 17 questions on all three models (51 answers), so a test
//         restaurant or coffee shop there gets answers from its own trade and city (BUG-072). About $0.75.
// Every answer is a real paid call, so it only runs with LIVE_AI_CALL=1, and only after the AI keys are rotated (B-01):
//   LIVE_AI_CALL=1 npm run record:ai-answers
//   LIVE_AI_CALL=1 RECORD_SET=food npm run record:ai-answers
// Keys come from the shell, or else .env.local, or else .env. Answers already recorded are skipped, so a stopped run
// resumes; the base set removes the synthetic placeholders once every answer is recorded.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";
import { createAiClients } from "@/modules/ai";
import { createNameExtractor } from "@/modules/scanning/extract";
import { createAnthropicCheck } from "@/modules/scanning/providers/anthropic";
import { CHECK_MODELS } from "@/modules/scanning/providers/models";
import { createOpenAICheck } from "@/modules/scanning/providers/openai";
import { createPerplexityCheck } from "@/modules/scanning/providers/perplexity";
import type { CheckLocation, ProviderId, RunCheck } from "@/modules/scanning/providers/types";

const live = process.env.LIVE_AI_CALL === "1";
const DIR = path.join(process.cwd(), "tests", "fixtures", "ai-answers");
const AT_ONCE = 3;

const SET = process.env.RECORD_SET === "food" ? "food" : "base";

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

// Islamabad, where the 2026-10-14 checks (KFC, Tim Hortons) ran. File names use the industry word recorded.ts maps
// a business industry to: "restaurant" and "coffee".
const FOOD_CITY: CheckLocation & { slug: string } = { slug: "islamabad", city: "Islamabad", region: "Islamabad Capital Territory", country: "PK" };
const FOOD_QUESTIONS: Record<string, string[]> = {
  restaurant: [
    "What is the best restaurant in {city}?",
    "Where can I get the best fried chicken in {city}?",
    "What is the best fast food restaurant in {city}?",
    "Which burger place in {city} do locals recommend?",
    "Where can I find an affordable family restaurant in {city}?",
    "Which restaurant in {city} has the best reviews?",
    "What's the best fast food delivery in {city}?",
    "Which fast food chains in {city} are the most popular?",
    "Where can I get good biryani in {city}?",
  ],
  coffee: [
    "What is the best coffee shop in {city}?",
    "Which coffee chains are in {city}?",
    "Which coffee shop in {city} has the best reviews?",
    "Where can I find an affordable coffee shop in {city}?",
    "Which coffee shop in {city} do locals recommend for donuts?",
    "Where can I find a quiet cafe to work from in {city}?",
    "Which cafe in {city} has the best iced coffee?",
    "What is a good local coffee shop in {city}?",
  ],
};

function envFile(name: string): string | undefined {
  for (const file of [".env.local", ".env"]) {
    const value = existsSync(file) ? parseEnv(readFileSync(file, "utf8"))[name] : undefined;
    if (value) return value;
  }
  return undefined;
}

function key(name: string): string {
  const fromFile = envFile(name);
  const value = process.env[name] || fromFile;
  if (!value) throw new Error(`${name} is not set in the shell, .env.local or .env`);
  return value;
}

/** Like key(), but undefined when unset: the OpenAI backup is optional (D-84). */
function optionalKey(name: string): string | undefined {
  return process.env[name] || envFile(name) || undefined;
}

type Job = { file: string; provider: ProviderId; question: string; location: CheckLocation };

/** The answers to record: the base set, or the food set (RECORD_SET=food). */
export function jobs(set: "base" | "food" = SET): Job[] {
  const cities = set === "food" ? [FOOD_CITY] : CITIES;
  const questions = set === "food" ? FOOD_QUESTIONS : QUESTIONS;
  return cities.flatMap((location) =>
    Object.entries(questions).flatMap(([industry, templates]) =>
      templates.flatMap((template, i) =>
        (Object.keys(CHECK_MODELS) as ProviderId[]).map((provider) => ({
          file: `recorded-${provider}-${industry}-${location.slug}-${i + 1}.json`,
          provider,
          // Islamabad is asked by its name alone, as our questions do for a long region (BUG-085).
          question: template.replace("{city}", location.country === "US" ? `${location.city}, ${location.region}` : location.city),
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
  const extractNames = createNameExtractor(
    createAiClients({ anthropicKey: key("ANTHROPIC_API_KEY"), openaiKey: optionalKey("OPENAI_API_KEY") }),
  );
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
  if (SET === "base") {
    for (const file of readdirSync(DIR).filter((f) => f.startsWith("synthetic-"))) rmSync(path.join(DIR, file));
    console.log("Removed the synthetic placeholders.");
  }
  console.log("Read through the names in the new files before committing.");
});

it.skipIf(live)("skipped: set LIVE_AI_CALL=1 (and rotate the AI keys first, B-01) to make the real calls", () => {});

// Free: checks the food set's file names before anything is paid for.
it("names the food set's files so recorded.ts files them under the right trade and city", () => {
  const food = jobs("food");
  expect(food).toHaveLength(51);
  expect(new Set(food.map((j) => j.file.match(/^recorded-(?:openai|anthropic|perplexity)-([a-z]+)-([a-z0-9-]+?)-\d+\.json$/)?.slice(1).join("|")))).toEqual(
    new Set(["restaurant|islamabad", "coffee|islamabad"]),
  );
  expect(food.every((j) => j.question.endsWith(" Islamabad?") || j.question.includes("Islamabad"))).toBe(true);
  expect(jobs("base")).toHaveLength(144);
});
