// The real auto-fill sources for the paid suites (Firecrawl, Google Places, Claude or the OpenAI backup). Auto-fill
// hides provider failures from the user; these record them so they count as API errors (principle 9), not as
// model failures.
import type { AutofillClients } from "@/modules/onboarding/autofill";
import { createBusinessExtractor, ExtractError } from "@/modules/onboarding/extract";
import { createFirecrawlScraper } from "@/modules/onboarding/firecrawl";
import { createPlacesSearch } from "@/modules/onboarding/places";
import { evalAiClients, EVAL_PROVIDER, missingEvalKey } from "../shared/ai-clients";

const keys = {
  firecrawl: process.env.FIRECRAWL_API_KEY,
  places: process.env.GOOGLE_PLACES_API_KEY,
};

/** The keys a paid run still needs, empty when it can run. */
export function missingAutofillKeys(): string[] {
  return [...Object.entries(keys).filter(([, v]) => !v).map(([k]) => k), ...[missingEvalKey() ?? []].flat()];
}

export function recordingClients(errors: string[]): AutofillClients {
  const scrape = createFirecrawlScraper(keys.firecrawl ?? "");
  const searchPlaces = createPlacesSearch(keys.places ?? "");
  const extract = createBusinessExtractor(evalAiClients());
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
        if (!(err instanceof ExtractError && err.modelFault)) errors.push(`${EVAL_PROVIDER}: ${String(err)}`);
        throw err;
      }),
  };
}
