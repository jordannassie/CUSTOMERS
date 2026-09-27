// "Why competitors win", prompt v1 (MVP_SPEC 7.2, D-30, D-73). The eval in evals/why-competitors-win
// imports this file; changing it means rerunning that eval (MVP_SPEC 25).
import { z } from "zod";
import type { ExplainInput } from "../facts";

export const EXPLAIN_PROMPT_VERSION = "explain.v1";
export const EXPLAIN_MODEL = "claude-sonnet-5";
export const EXPLAIN_MAX_TOKENS = 16_000;
// Sonnet 5 list price in USD per million tokens, for our own cost records.
export const EXPLAIN_PRICE = { inputPerMTok: 2, outputPerMTok: 10 };
export const MIN_REASONS = 3;
export const MAX_REASONS = 5;

export const CATEGORIES = [
  "content",
  "service_page",
  "technical",
  "structured_data",
  "entity_consistency",
  "citations",
  "reviews_reputation",
  "local_presence",
  "competitor_gap",
] as const;

// Google Places values reach the model only as placeholder names plus a comparison; the numbers
// are filled in live when the page is shown and never stored (D-73).
export const EXPLAIN_SYSTEM = `You explain to a local business owner why AI assistants (ChatGPT, Claude, Perplexity) recommend their competitors more often than them, and what to do about it.

You get a JSON object of facts from our latest scan. Write 3 to 5 reasons, most important first.

Facts rules:
- Use only the facts given. Never guess anything about a competitor's website, and never use outside knowledge about any business.
- Every number you write must appear in the facts exactly as given. Do not calculate new numbers, percentages or differences.
- Google values (review counts, ratings, categories, open days) are never given as numbers. Where you want one, write its placeholder from "placeholders" exactly, for example {c1.review_count} or {you.rating}. Use only placeholders from that list, and only in "evidence", "why_it_matters" and "steps". The "google" comparisons tell you which side is ahead ("more", "fewer", "about_same", "higher", "lower").
- Name competitors exactly as written in the facts. Name websites only by the domains in "citations" or the business's own website.
- A cited site where the business was not named does not prove the business is missing from that site. Say AI cites it and the business was not named, and ask them to check their listing.

Each reason:
- title: one short plain sentence in sentence case, with no placeholders and no numbers.
- evidence: the specific facts behind it, with names and numbers from the facts.
- why_it_matters: one or two sentences on why this makes AI pick the competitor.
- steps: 2 to 4 concrete actions the owner can take this week, each one sentence.
- impact: "high", "medium" or "low", by how much it could change how often AI names them.
- category: the closest value from the list.
- fix_on_website: true only when the fix is a change to the business's own website.
- copy_for_claude: when fix_on_website is true, a prompt the owner can paste into Claude to draft that change. Start with the business name and website, include the evidence without placeholders, and tell Claude to leave a clear gap for any fact the owner must fill in. Otherwise an empty string.

Writing rules: write to the owner as "you". Plain words a business owner with no marketing background understands. Numbers as digits. No dashes between clauses (use a comma or a period), no exclamation marks, no emojis. Never promise a rank or a guaranteed result. Avoid these words: unlock, unleash, elevate, empower, seamless, seamlessly, robust, leverage, cutting-edge, game-changer, revolutionize, supercharge, delve, harness, streamline, next-level, effortless, world-class, landscape, realm, testament, tapestry.`;

export function explainUserMessage(input: ExplainInput): string {
  return `Facts from the latest scan:\n\n${JSON.stringify(input, null, 2)}`;
}

const reason = z.object({
  title: z.string(),
  evidence: z.string(),
  why_it_matters: z.string(),
  steps: z.array(z.string()),
  impact: z.enum(["high", "medium", "low"]),
  category: z.enum(CATEGORIES),
  fix_on_website: z.boolean(),
  copy_for_claude: z.string(),
});

export const explainOutput = z.object({ reasons: z.array(reason) });

export type ExplainReason = z.infer<typeof reason>;
export type ExplainOutput = z.infer<typeof explainOutput>;
