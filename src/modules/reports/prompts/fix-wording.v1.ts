// Report fix wording, prompt v1 (PDF report v2). The fixes are built in code with template wording; this optional
// step asks Claude Sonnet 5 to rewrite only each fix's title, why and steps from the same facts. Every answer is
// checked in src/modules/reports/v2/wording/validate.ts and a fix that fails keeps its template text. The eval in
// evals/report-fix-wording imports this file; changing it means rerunning that eval (MVP_SPEC 25).
import { z } from "zod";

export const FIX_WORDING_PROMPT_VERSION = "fix-wording.v1";
export const FIX_WORDING_MODEL = "claude-sonnet-5";
export const FIX_WORDING_MAX_TOKENS = 8_000;
export const FIX_WORDING_TIMEOUT_MS = 90_000;

export const TITLE_MAX_CHARS = 60;
export const WHY_MAX_SENTENCES = 2;
export const WHY_MAX_CHARS = 320;
export const MIN_STEPS = 2;
export const MAX_STEPS = 4;
export const STEP_MAX_CHARS = 200;

/** One fix as the writer sees it: the issue's facts, and the template wording to improve on. */
export type FixWordingItem = {
  key: string;
  /** "Fix 1" is n 1. */
  n: number;
  /** Where the fix is made, as labels ("Your website", "Google Business Profile"). */
  areas: string[];
  where: string;
  priority: string;
  impact: string;
  effort: string;
  /** "What AI showed us", with its numbers. */
  evidence: string;
  goal: { label: string; text: string };
  /** The template wording, which is correct but stiff. */
  draft: { title: string; why: string; steps: string[] };
  /** Every number this fix may use, as written in its facts. */
  numbers: string[];
};

export type FixWordingInput = {
  business: { name: string; market: string | null; website: string | null };
  /** The AI assistants checked ("ChatGPT", "Claude", "Perplexity"), named exactly as written here. */
  assistants: string[];
  /** Other businesses in the report, named exactly as written here. */
  otherBusinesses: string[];
  fixes: FixWordingItem[];
};

export const FIX_WORDING_SYSTEM = `You rewrite the fix list in a report for a local business owner. The report shows how often AI assistants (ChatGPT, Claude, Perplexity) name the business when people ask for local recommendations, and what the owner can change so they are named more often.

You get a JSON object with the business and its fixes. Each fix has its facts (areas, where, priority, evidence, goal), a draft written from fixed templates, and the numbers it may use. Rewrite each fix's title, why and steps so they read like a person who knows local businesses wrote them for this owner. Return one entry for every fix, with its key exactly as given.

Facts rules:
- Use only the facts given for that fix. Never add facts about the business, a competitor or a website, and never use outside knowledge.
- Every number you write must appear in that fix's "numbers" exactly as written there. Do not calculate new numbers, percentages or differences. Write counts as digits.
- Keep the meaning of the draft: the same problem, the same place to fix it, the same actions. Make it clearer and more specific to this business; do not change what the owner should do.
- Name the business, other businesses, assistants and websites exactly as written in the input. Name a website only if it appears in the fix's facts or is the business's own website.

Each fix:
- title: what to do, in one short sentence in sentence case, at most ${TITLE_MAX_CHARS} characters, with no full stop at the end. Sentence case never changes a name.
- why: one or two sentences on why this change helps AI assistants name the business, tied to the evidence.
- steps: ${MIN_STEPS} to ${MAX_STEPS} concrete actions the owner can take, in order, each one sentence that starts with a verb.

Writing rules: write to the owner as "you". Plain words a business owner with no marketing background understands. No dashes between clauses (use a comma or a period), no exclamation marks, no emojis, no semicolons. Never promise a result: no guarantees, no "rank first", no "#1", no "will rank", and never say a change will make AI name them. Say it can help, or makes it more likely. Avoid these words: unlock, unleash, elevate, empower, seamless, seamlessly, robust, leverage, cutting-edge, game-changer, revolutionize, supercharge, delve, harness, streamline, next-level, effortless, world-class, landscape, realm, testament, tapestry.`;

export function fixWordingUserMessage(input: FixWordingInput): string {
  return `The business and its fixes:\n\n${JSON.stringify(input, null, 2)}`;
}

// No length limits in the schema: structured outputs do not enforce them on both providers, so the code checks do.
const fixWording = z.object({
  key: z.string().describe("The fix key, exactly as given."),
  title: z.string().describe(`At most ${TITLE_MAX_CHARS} characters, sentence case, no full stop.`),
  why: z.string().describe("One or two sentences."),
  steps: z.array(z.string()).describe(`${MIN_STEPS} to ${MAX_STEPS} steps, each one sentence.`),
});

export const fixWordingOutput = z.object({ fixes: z.array(fixWording) });

export type FixWording = z.infer<typeof fixWording>;
export type FixWordingOutput = z.infer<typeof fixWordingOutput>;
