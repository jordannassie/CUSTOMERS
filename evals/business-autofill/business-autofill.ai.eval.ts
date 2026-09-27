// Runs the real auto-fill (Firecrawl, Google Places, Claude Haiku, sometimes Sonnet: paid calls per
// business) on the labelled businesses, so it lives in the AI suite (eval-ai.yml).
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { autofill, type AutofillClients } from "@/modules/onboarding/autofill";
import { createBusinessExtractor, ExtractError } from "@/modules/onboarding/extract";
import { createFirecrawlScraper } from "@/modules/onboarding/firecrawl";
import { createPlacesSearch } from "@/modules/onboarding/places";
import { AUTOFILL_MODEL, AUTOFILL_PROMPT_VERSION, AUTOFILL_RETRY_MODEL } from "@/modules/onboarding/prompts/business-autofill.v1";
import type { BusinessDetails } from "@/modules/onboarding/schema";
import { apiErrorCase, gradeCase, loadDataset, score, type AutofillCase, type GradedCase } from "./grader";

const dataset = loadDataset();
const keys = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  firecrawl: process.env.FIRECRAWL_API_KEY,
  places: process.env.GOOGLE_PLACES_API_KEY,
};
const missingKeys = Object.entries(keys).filter(([, v]) => !v).map(([k]) => k);
const ready = dataset !== null && missingKeys.length === 0;

type Output = { details: BusinessDetails | null; apiError: string | null };

// Auto-fill hides provider failures from the user; the eval records them so they count as API
// errors (principle 9) rather than as model failures.
function recordingClients(errors: string[]): AutofillClients {
  const scrape = createFirecrawlScraper(keys.firecrawl ?? "");
  const searchPlaces = createPlacesSearch(keys.places ?? "");
  const extract = createBusinessExtractor(keys.anthropic ?? "");
  return {
    scrape: async (domain) => {
      const pages = await scrape(domain);
      if (pages.every((p) => p.status === "failed")) errors.push("firecrawl: every page failed");
      return pages;
    },
    searchPlaces: (query) =>
      searchPlaces(query).catch((err: unknown) => {
        errors.push(`places: ${String(err)}`);
        throw err;
      }),
    extract: (input) =>
      extract(input).catch((err: unknown) => {
        if (!(err instanceof ExtractError && err.modelFault)) errors.push(`anthropic: ${String(err)}`);
        throw err;
      }),
  };
}

const harness = createHarness<AutofillCase, Output>({
  name: "business-autofill",
  run: async ({ input }) => {
    const errors: string[] = [];
    const run = await autofill(input.input, recordingClients(errors));
    const output: Output = errors.length
      ? { details: null, apiError: errors.join("; ") }
      : { details: run.result.details, apiError: null };
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

// Skipped until a person has labelled dataset.v1.jsonl (see README.md), and without the three keys.
describeEval(`business auto-fill ${AUTOFILL_PROMPT_VERSION}`, { harness, skipIf: () => !ready }, (it) => {
  it("passes schema 100% with zero invented fields", async ({ run }) => {
    const graded: GradedCase[] = [];
    for (const c of dataset ?? []) {
      const { output } = await run(c);
      graded.push(output.details === null ? apiErrorCase(c, output.apiError ?? "") : gradeCase(c, output.details));
    }
    const result = { ...score(graded), models: [AUTOFILL_MODEL, AUTOFILL_RETRY_MODEL], prompt: AUTOFILL_PROMPT_VERSION };

    // Every case saved in full (principle 10). Real cost is read from the provider dashboards for now.
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`business-autofill.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("business auto-fill", result);
    for (const g of graded.filter((c) => c.invented.length || c.wrong.length || c.missed.length)) {
      console.log(`${g.id}: invented ${JSON.stringify(g.invented)}, wrong ${JSON.stringify(g.wrong)}, missed ${JSON.stringify(g.missed)}`);
    }
    expect(result.scored).toBeGreaterThan(0);
    expect(result.schemaRate).toBe(1);
    expect(result.inventedFields).toBe(0);
  });
});

it.skipIf(ready)(
  dataset === null
    ? "skipped: evals/business-autofill/dataset.v1.jsonl is not labelled yet (see README.md)"
    : `skipped: ${missingKeys.join(", ")} API key not set`,
  () => {},
);
