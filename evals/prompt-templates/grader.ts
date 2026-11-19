// Code grader for every "Copy for Claude" prompt and copied message (MVP_SPEC 7.2, 7.3, 25). No model is
// called: each case is a business and a scan summary, the prompts come from the real code that builds them.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { explain, ruleDrafts } from "@/modules/insights/explain";
import type { CheckRow, ExplainSources } from "@/modules/insights/facts";
import { templateWriter } from "@/modules/insights/template-writer";
import { reviewMessage, websitePrompt, type ChecklistBusiness } from "@/modules/opportunities/checklist";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);

export const MIN_LENGTH = 120;
export const MAX_LENGTH = 2500;

const caseSchema = z.object({
  id: z.string().min(1),
  business: z.object({
    name: z.string().min(1),
    city: z.string().nullable(),
    region: z.string().nullable(),
    industry: z.string().nullable(),
    domain: z.string().nullable(),
    hasWebsite: z.boolean(),
    phone: z.string().nullable(),
    description: z.string().nullable(),
    services: z.array(z.string()),
  }),
  question: z.string().min(1),
  answers: z.number().int().min(1).max(30),
  // How many answers named the business, and each competitor.
  namedYou: z.number().int().min(0),
  competitors: z.array(z.object({ name: z.string().min(1), named: z.number().int().min(0) })),
  cited: z.array(z.string()),
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
});
export type PromptCase = z.infer<typeof caseSchema>;

export function loadDataset(): PromptCase[] {
  return readFileSync(DATASET_PATH, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = caseSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`dataset.v1.jsonl line ${i + 1}: ${parsed.error.message}`);
      return parsed.data;
    });
}

const PROVIDERS = ["openai", "anthropic", "perplexity"];

export function sourcesFor(c: PromptCase): ExplainSources {
  const checks: CheckRow[] = Array.from({ length: c.answers }, (_, i) => ({
    provider: PROVIDERS[i % 3],
    question: c.question,
    businessMentioned: i < c.namedYou,
    competitorsMentioned: c.competitors.map((comp) => ({ name: comp.name, mentioned: i < comp.named, position: null })),
    citations: c.cited.map((domain) => ({ url: `https://${domain}/page-${i}`, title: null })),
  }));
  return {
    business: { ...c.business, placesId: null },
    competitors: c.competitors.map((comp, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      name: comp.name,
      placesId: null,
    })),
    checks,
    alsoNamed: [],
    siteFacts: null,
    signals: new Map(),
  };
}

export type BuiltPrompt = { from: "explanation" | "rules" | "checklist website" | "checklist reviews"; kind: "claude" | "message"; text: string };

/** Every prompt the product can show for this case: the explanation, the rules fallback and the checklist. */
export async function promptsFor(c: PromptCase): Promise<BuiltPrompt[]> {
  const src = sourcesFor(c);
  const explanation = await explain(src, templateWriter);
  const checklistBusiness: ChecklistBusiness = { ...c.business, placesId: null };
  const claude = (from: BuiltPrompt["from"]) => (text: string | null) => (text ? [{ from, kind: "claude" as const, text }] : []);
  return [
    ...explanation.drafts.flatMap((d) => claude("explanation")(d.claude_prompt)),
    ...ruleDrafts(src).flatMap((d) => claude("rules")(d.claude_prompt)),
    { from: "checklist website", kind: "claude", text: websitePrompt(checklistBusiness) },
    { from: "checklist reviews", kind: "message", text: reviewMessage(checklistBusiness) },
  ];
}

// Gaps the owner fills in themselves; anything else in brackets is a template bug.
const ALLOWED_GAPS: Record<BuiltPrompt["kind"], string[]> = {
  claude: ["[fill in]"],
  message: ["[customer name]", "[your Google review link]", "[your name]"],
};
const EMPTY_BITS: [RegExp, string][] = [
  [/\{[^{}]*\}/, "unfilled placeholder"],
  [/\b(undefined|null|NaN)\b/, "missing value printed"],
  [/\(\s*\)|\[\s*\]|""|''/, "empty brackets or quotes"],
  [/ {2,}| [,.:;]/, "gap where a value is missing"],
  [/\bin ,|\bfor ,|\bof ,/, "gap where a value is missing"],
];
const INVENT_GUARD = /do not invent|never invent/i;

export function gradePrompt(prompt: BuiltPrompt, businessName: string): string[] {
  const issues: string[] = [];
  const { text, kind } = prompt;
  for (const [pattern, issue] of EMPTY_BITS) if (pattern.test(text)) issues.push(issue);
  for (const gap of text.match(/\[[^\]\n]*\]/g) ?? []) {
    if (!ALLOWED_GAPS[kind].includes(gap)) issues.push(`unknown gap: ${gap}`);
  }
  if (text.length < MIN_LENGTH) issues.push(`too short: ${text.length} characters`);
  if (text.length > MAX_LENGTH) issues.push(`too long: ${text.length} characters`);
  if (!text.includes(businessName)) issues.push("does not name the business");
  if (/[\u2013\u2014]/.test(text)) issues.push("long dash");
  if (/\p{Extended_Pictographic}/u.test(text)) issues.push("emoji");
  if (!/^[A-Z]/.test(text)) issues.push("does not start with a capital letter");
  if (kind === "claude") {
    if (!INVENT_GUARD.test(text)) issues.push("no rule against inventing facts");
    if (!/[.:?]$/.test(text.trim())) issues.push("does not end with a full sentence");
  }
  return [...new Set(issues)];
}
