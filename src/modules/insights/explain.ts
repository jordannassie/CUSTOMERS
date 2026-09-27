// "Why competitors win" (MVP_SPEC 7.2, D-30): after a scan, Claude Sonnet 5 turns the scan's facts
// into 3 to 5 reasons, each stored as an opportunity. The writer is injected, so tests and evals run
// this exact flow on fixtures. When Claude is unavailable or its answer fails the checks, the fixed
// rules in opportunity-engine.ts are used instead.
import { generateOpportunities } from "@/lib/geo/opportunity-engine";
import type { OpportunityCategory, OpportunityImpact } from "@/types/geo";
import { buildExplainInput, domainOf, type ExplainInput, type ExplainSources } from "./facts";
import { toStored } from "./placeholders";
import { MAX_REASONS, MIN_REASONS, type ExplainOutput, type ExplainReason } from "./prompts/explain.v1";
import { reasonIssues } from "./validate";

export type WriterUsage = { inputTokens: number; outputTokens: number };

export type WriteExplanation = (input: ExplainInput) => Promise<{ output: ExplainOutput; model: string; usage: WriterUsage | null }>;

export type OpportunityDraft = {
  title: string;
  description: string;
  evidence: string;
  impact: OpportunityImpact;
  category: OpportunityCategory;
  recommended_action: string;
  claude_prompt: string | null;
};

export type Explanation = {
  source: "ai" | "rules";
  model: string | null;
  drafts: OpportunityDraft[];
  /** Reasons Claude wrote that failed the checks, with why. */
  dropped: { title: string; issues: string[] }[];
  /** Why the rules were used, when they were. */
  fallbackReason: string | null;
  usage: WriterUsage | null;
};

export function stepsText(steps: string[]): string {
  return steps
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");
}

function toDraft(reason: ExplainReason, keys: Record<string, string>): OpportunityDraft | null {
  const evidence = toStored(reason.evidence.trim(), keys);
  const description = toStored(reason.why_it_matters.trim(), keys);
  const steps = toStored(stepsText(reason.steps), keys);
  if (evidence === null || description === null || steps === null) return null;
  return {
    title: reason.title.trim(),
    description,
    evidence,
    impact: reason.impact,
    category: reason.category,
    recommended_action: steps,
    claude_prompt: reason.fix_on_website && reason.copy_for_claude.trim() ? reason.copy_for_claude.trim() : null,
  };
}

/** Rules fallback (MVP_SPEC 7.2): fixed, evidence-based opportunities from the same scan. */
export function ruleDrafts(src: ExplainSources): OpportunityDraft[] {
  const names = new Map(src.competitors.map((c) => [c.name.trim().toLowerCase(), c.name]));
  return generateOpportunities({
    businessName: src.business.name,
    domain: src.business.domain ? domainOf(`https://${src.business.domain.replace(/^https?:\/\//, "")}`) : null,
    description: src.business.description,
    primaryCity: src.business.city,
    results: src.checks.map((check) => ({
      business_mentioned: check.businessMentioned,
      competitors_mentioned: mentionedNames(check.competitorsMentioned)
        .filter((n) => names.has(n.toLowerCase()))
        .map((name) => ({ name })),
      cited_sources: Array.isArray(check.citations)
        ? check.citations.filter((c): c is { url: string } => typeof c?.url === "string").map((c) => ({ url: c.url }))
        : [],
    })),
  }).map((o) => ({ ...o, claude_prompt: o.claude_prompt || null }));
}

function mentionedNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((m) => m && m.mentioned === true && typeof m.name === "string").map((m) => m.name as string);
}

export async function explain(src: ExplainSources, write: WriteExplanation | null): Promise<Explanation> {
  const rules = (fallbackReason: string, extra: Partial<Explanation> = {}): Explanation => ({
    source: "rules",
    model: null,
    drafts: ruleDrafts(src),
    dropped: [],
    fallbackReason,
    usage: null,
    ...extra,
  });
  if (src.checks.length === 0) return rules("the scan has no saved answers");
  if (!write) return rules("no writer (ANTHROPIC_API_KEY is not set)");

  const { input, keys } = buildExplainInput(src);
  let written: Awaited<ReturnType<WriteExplanation>>;
  try {
    written = await write(input);
  } catch (err) {
    return rules(`writer failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const drafts: OpportunityDraft[] = [];
  const dropped: Explanation["dropped"] = [];
  for (const reason of written.output.reasons) {
    const issues = reasonIssues(reason, input);
    const draft = issues.length === 0 ? toDraft(reason, keys) : null;
    if (draft) drafts.push(draft);
    else dropped.push({ title: reason.title, issues: issues.length ? issues : ["unknown competitor key"] });
  }
  if (drafts.length < MIN_REASONS) {
    return rules(`only ${drafts.length} of ${written.output.reasons.length} reasons passed the checks`, {
      dropped,
      usage: written.usage,
    });
  }
  return {
    source: "ai",
    model: written.model,
    drafts: drafts.slice(0, MAX_REASONS),
    dropped,
    fallbackReason: null,
    usage: written.usage,
  };
}
