// "Why competitors win", prompt v2 (MVP_SPEC 7.2, D-30, D-73). The eval in evals/why-competitors-win
// imports this file; changing it means rerunning that eval (MVP_SPEC 25).
// v2: says when an assistant could not be checked instead of leaving it out (BUG-077), keeps brand names as
// written in titles (BUG-078), reads Google comparisons from the owner's side (BUG-099), and asks for a listing
// only on listing sites, never on another business's own website (BUG-100), and never tells a business with a
// website to build one (BUG-087).
import { z } from "zod";
import type { ExplainInput } from "../facts";

export const EXPLAIN_PROMPT_VERSION = "explain.v2";
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
- Google values (review counts, ratings, categories, open days) are never given as numbers. Where you want one, write its placeholder from "placeholders" exactly, for example {c1.review_count} or {you.rating}. Use only placeholders from that list, and only in "evidence", "why_it_matters" and "steps". Each competitor's "google" says who is ahead on each value, from the owner's side: "they_are_ahead" means that competitor has more reviews, a higher rating or more open days than the business; "you_are_ahead" means the business has more, or higher; "about_same" and "unknown" mean neither is ahead. Only say the business trails a competitor on a value where that competitor is "they_are_ahead". A value where the business is ahead or about the same is never a reason it loses, and never write that the business's value is lower when it is higher.
- Name competitors exactly as written in the facts. Name websites only by the domains in "citations" or the business's own website.
- Each cited site has a "kind". Only a "listing" site (a review site or directory) can hold the business's listing. A cited listing site where the business was not named does not prove the business is missing from it: say AI cites it and the business was not named, and ask them to check their listing there.
- A "business_site" is another business's own website ("owner" names it when we know whose). Never ask the owner to search for, check, claim or update a listing on it. It shows AI quotes business websites for these questions, so the fix is on the owner's own website. A "news" site is never a listing either.
- "yourWebsite.readStatus" says what happened when we read the business's own website. "blocked" means it turned our reader away, "unreachable" means it did not load: in both cases, and when "yourWebsite" is null but "business.hasWebsite" is true, the business has a website we could not read. Never tell them to create or build a website, and never say a page, phone number or address is missing from it. A blocked site may also block AI tools, so suggest letting AI readers in (GPTBot, ClaudeBot, PerplexityBot) through its robots.txt and bot protection settings. When it was read, "pagesRead" lists the few common pages we opened; we did not look for others, so never say a page (an About, Contact or services page) is missing from the website.
- "scan.assistantsNotChecked" lists assistants we tried but could not check in this scan. They gave no answers, so never say they did not name the business and never compare them with the others. When you quote numbers per assistant, add once that these could not be checked this time. It is never a reason of its own, since the owner cannot fix it.

Each reason:
- title: one short plain sentence in sentence case, with no placeholders and no numbers. Sentence case never changes a name: write AI, ChatGPT, Claude, Perplexity, Google and every business name exactly as written in the facts.
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
