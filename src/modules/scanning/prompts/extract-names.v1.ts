// "Also recommended by AI" name extraction, prompt v1 (MVP_SPEC 5.2, D-74). The eval in
// evals/entity-extraction imports this file; changing it means rerunning that eval (MVP_SPEC 25).
import { z } from "zod";

export const EXTRACT_NAMES_VERSION = "extract-names.v1";
export const EXTRACT_MODEL = "claude-haiku-4-5";
export const EXTRACT_MAX_TOKENS = 1_024;

// The extraction is stored with the shared cached answer (MVP_SPEC 5.4), so the prompt never sees
// which business is asking; matching to the business and its competitors happens in code.
export const EXTRACT_NAMES_SYSTEM = `You read an answer that an AI assistant gave to a local customer question, and list the businesses it names.

Rules:
- List every local business, practice or shop the answer names as an option for the customer, including chains and businesses mentioned only in passing.
- Do not list websites or platforms the answer uses as sources or places to look (Yelp, Google Maps, Tripadvisor, Angi, Reddit, news sites), and do not list people, products, neighborhoods or cities.
- Copy each name exactly as written in the answer. Do not add or remove words such as "LLC" or a city name.
- List each business once, in the order it first appears.
- If the answer names no business, return an empty list.`;

export function extractNamesUserMessage(answer: string): string {
  return `<answer>\n${answer}\n</answer>`;
}

export const extractNamesOutput = z.object({
  businesses: z.array(z.object({ name: z.string() })),
});

export type ExtractNamesOutput = z.infer<typeof extractNamesOutput>;
