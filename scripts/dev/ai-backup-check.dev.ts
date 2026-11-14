// Live smoke check for the background AI jobs on one provider (D-84): auto-fill (and its retry model), question
// picking and writing, name extraction, "why competitors win" and question library drafting, each once on the
// hand-built fixtures. Not an eval: there is no labelled data here; it proves each provider accepts the job's
// schema and answers in the job's shape. Real paid calls (about $0.15 on OpenAI), so it needs LIVE_AI_CALL=1:
//   LIVE_AI_CALL=1 AI_CHECK_PROVIDER=openai npx vitest run --project dev scripts/dev/ai-backup-check.dev.ts
//   LIVE_AI_CALL=1 AI_CHECK_PROVIDER=anthropic npx vitest run --project dev scripts/dev/ai-backup-check.dev.ts
// Keys come from the shell or .env.local.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { createAiClients, type AiClients } from "@/modules/ai";
import { buildExplainInput } from "@/modules/insights/facts";
import { COFFEE_SOURCES } from "@/modules/insights/fixtures";
import { createExplanationWriter } from "@/modules/insights/writer";
import { createBusinessExtractor, type AutofillModel } from "@/modules/onboarding/extract";
import { COFFEE_DOMAIN, COFFEE_PAGES } from "@/modules/onboarding/fixtures";
import { AUTOFILL_MODEL, AUTOFILL_RETRY_MODEL } from "@/modules/onboarding/prompts/business-autofill.v1";
import { COFFEE_BUSINESS, COFFEE_LIBRARY } from "@/modules/onboarding/question-fixtures";
import { createQuestionModel } from "@/modules/onboarding/question-model";
import { createTemplateDrafter } from "@/modules/question-library/generate";
import { createNameExtractor } from "@/modules/scanning/extract";

const live = process.env.LIVE_AI_CALL === "1";
const provider = process.env.AI_CHECK_PROVIDER === "anthropic" ? "anthropic" : "openai";
const TIMEOUT = 180_000;

function key(name: string): string | undefined {
  const fromFile = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8"))[name] : undefined;
  return process.env[name] || fromFile || undefined;
}

// One provider at a time: Claude with the backup off, or the backup as if Claude were down.
const ai = (): AiClients =>
  provider === "anthropic"
    ? createAiClients({ anthropicKey: key("ANTHROPIC_API_KEY"), fallbackEnabled: false })
    : createAiClients({ anthropicKey: null, openaiKey: key("OPENAI_API_KEY") });

const pages = COFFEE_PAGES.filter((p) => p.status === "ok" && p.markdown).map((p) => ({ path: p.path, markdown: p.markdown }));
const business = { industry: COFFEE_BUSINESS.industry ?? "coffee_shop", kind: "coffee shop", services: COFFEE_BUSINESS.services, description: COFFEE_BUSINESS.description };

describe.runIf(live)(`background jobs on ${provider}`, () => {
  it.each<AutofillModel>([AUTOFILL_MODEL, AUTOFILL_RETRY_MODEL])("auto-fill reads the site (%s tier)", { timeout: TIMEOUT }, async (model) => {
    const out = await createBusinessExtractor(ai())({ domain: COFFEE_DOMAIN, pages, model });
    console.log(`\n[auto-fill ${model}]`, JSON.stringify(out));
    expect(out.name).toMatch(/Sunrise/);
    expect(out.industry).toBe("coffee_shop");
    expect(out.services.length).toBeGreaterThan(0);
  });

  it("question picking returns template numbers from the list", { timeout: TIMEOUT }, async () => {
    const templates = COFFEE_LIBRARY.map((t, i) => ({ number: i + 1, template: t.template, tags: t.tags, intent: t.intent }));
    const numbers = await createQuestionModel(ai()).pick({ business, templates });
    console.log("\n[pick]", numbers);
    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers.every((n) => n >= 1 && n <= templates.length)).toBe(true);
  });

  it("question writing returns questions with a {city} slot", { timeout: TIMEOUT }, async () => {
    const questions = await createQuestionModel(ai()).write({ business });
    console.log("\n[write]", questions.slice(0, 4).map((q) => q.template));
    expect(questions.length).toBeGreaterThan(5);
    expect(questions.some((q) => q.template.includes("{city}"))).toBe(true);
  });

  it("name extraction lists the businesses an answer names, in order", { timeout: TIMEOUT }, async () => {
    const answer = "1. **Contra Coffee & Tea**: great pour-overs.\n2. **Portola Coffee Roasters**: see Yelp.\nAlso try Kaffee Meister.";
    const result = await createNameExtractor(ai())(answer);
    console.log("\n[extract]", result.provider, result.model, result.names.map((n) => n.name), `$${result.costUsd}`);
    expect(result.names.map((n) => n.name)).toEqual(["Contra Coffee & Tea", "Portola Coffee Roasters", "Kaffee Meister"]);
  });

  it("why competitors win writes reasons in the explain.v2 shape", { timeout: TIMEOUT }, async () => {
    const { input } = buildExplainInput(COFFEE_SOURCES);
    const result = await createExplanationWriter(ai())(input);
    console.log("\n[explain]", result.model, result.usage, result.output.reasons.map((r) => r.title));
    expect(result.output.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("question library drafts templates for one industry", { timeout: TIMEOUT }, async () => {
    const templates = await createTemplateDrafter(ai())("coffee_shop");
    console.log("\n[library]", templates.length, templates.slice(0, 3).map((t) => t.template));
    expect(templates.length).toBeGreaterThan(10);
  });
});

it.skipIf(live)("skipped: set LIVE_AI_CALL=1 to make the real calls", () => {});
