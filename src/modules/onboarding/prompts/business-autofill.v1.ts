// Business auto-fill, prompt v1 (MVP_SPEC 3.2, D-18). The eval in evals/business-autofill imports
// this file; changing it means rerunning that eval (MVP_SPEC 25).
import { z } from "zod";
import { INDUSTRIES } from "../industries";

export const AUTOFILL_PROMPT_VERSION = "business-autofill.v1";
export const AUTOFILL_MODEL = "claude-haiku-4-5";
// Used once when Haiku leaves the name or industry empty or says its confidence is low.
export const AUTOFILL_RETRY_MODEL = "claude-sonnet-5";
export const AUTOFILL_MAX_TOKENS = 1_500;
// Per page, so four long pages still fit comfortably in one Haiku call.
export const MAX_PAGE_CHARS = 8_000;

// The model reads only the business's own website. Google Places values are merged in code
// (service.ts), so the precedence rules cannot drift and Places data never enters the site facts
// we store (D-73).
export const AUTOFILL_SYSTEM = `You read pages from a local business's own website and fill in facts about that business.

Rules:
- Use only the text in the pages. If a field is not stated, return an empty string (or an empty list for services). Never guess, never use outside knowledge, never invent.
- name: the business's own name as the site writes it, without taglines or a city added.
- industry: pick one value from the list: ${INDUSTRIES.join(", ")}. Use "other" when the business is clearly none of these. Leave it empty if the pages do not say what the business does.
- description: one or two plain sentences, written only from what the pages say about the business.
- services: the main services or products the business itself offers, short phrases, at most 12. Do not list brands it sells for others unless they are what it offers.
- city, state, country: where the business is located, only when the pages state its address or location. state as written (for the US, the two-letter code if the page uses it). country as the two-letter ISO code when the address makes it clear.
- phone: the business's main phone number exactly as written.
- address: the street address exactly as written.
- confidence: "high" when the pages clearly describe one business and you filled the name and industry from them; otherwise "low" (for example a blank, blocked, parked or directory page).`;

export type SitePage = { path: string; markdown: string };

export function autofillUserMessage(domain: string, pages: SitePage[]): string {
  const body = pages
    .map((p) => `<page path="${p.path}">\n${p.markdown.slice(0, MAX_PAGE_CHARS)}\n</page>`)
    .join("\n\n");
  return `Website: ${domain}\n\n${body}`;
}

export const autofillOutput = z.object({
  name: z.string(),
  industry: z.enum([...INDUSTRIES, ""]),
  description: z.string(),
  services: z.array(z.string()),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  phone: z.string(),
  address: z.string(),
  confidence: z.enum(["high", "low"]),
});

export type AutofillOutput = z.infer<typeof autofillOutput>;
