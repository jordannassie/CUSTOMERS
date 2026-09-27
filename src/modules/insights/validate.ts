// Code checks on each reason Claude writes (MVP_SPEC 7.2, 25): only given facts and placeholders,
// the right shape, and the writing guide. A reason with any issue is dropped before it is stored;
// the eval grader runs the same checks.
import type { ExplainInput } from "./facts";
import { bracesIn, stripPlaceholders } from "./placeholders";
import type { ExplainReason } from "./prompts/explain.v1";

// docs/design/WRITING.md: words that read as AI-written or salesy.
export const BANNED_WORDS = [
  "unlock",
  "unleash",
  "elevate",
  "empower",
  "seamless",
  "seamlessly",
  "robust",
  "leverage",
  "cutting-edge",
  "game-changer",
  "revolutionize",
  "supercharge",
  "delve",
  "harness",
  "streamline",
  "next-level",
  "effortless",
  "world-class",
  "landscape",
  "realm",
  "testament",
  "tapestry",
];

// Step and prompt text may count things ("ask your last 10 customers"); larger numbers must be facts.
const SMALL_NUMBER = 12;
const NUMBER = /\d+(?:[.,]\d+)*/g;
const DOMAIN = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|us|biz|info|app|dev|example)\b/gi;
const LONG_DASH = /[\u2013\u2014]/;
const EMOJI = /\p{Extended_Pictographic}/u;

const norm = (n: string) => n.replace(/,/g, "");

function collect(value: unknown, numbers: Set<string>): void {
  if (typeof value === "number") numbers.add(String(value));
  else if (typeof value === "string") for (const n of value.match(NUMBER) ?? []) numbers.add(norm(n));
  else if (Array.isArray(value)) for (const v of value) collect(v, numbers);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collect(v, numbers);
}

export function factNumbers(input: ExplainInput): Set<string> {
  const numbers = new Set<string>();
  collect({ ...input, placeholders: [] }, numbers);
  return numbers;
}

function knownDomains(input: ExplainInput): Set<string> {
  const out = new Set(input.citations.sites.map((s) => s.domain));
  if (input.business.website) out.add(input.business.website);
  return out;
}

function knownNames(input: ExplainInput): string[] {
  const names = [input.business.name, ...input.competitors.map((c) => c.name), ...input.alsoNamedByAI.map((a) => a.name)];
  return names.filter(Boolean).sort((a, b) => b.length - a.length);
}

/** Text with placeholders, business names and domains taken out, so only free-standing numbers remain. */
function bareText(text: string, input: ExplainInput): string {
  let out = stripPlaceholders(text).replace(DOMAIN, " ");
  for (const name of knownNames(input)) out = out.split(name).join(" ");
  return out;
}

function numberIssues(text: string, input: ExplainInput, facts: Set<string>, allowSmall: boolean): string[] {
  const issues: string[] = [];
  for (const raw of bareText(text, input).match(NUMBER) ?? []) {
    const n = norm(raw);
    if (facts.has(n)) continue;
    if (allowSmall && Number(n) <= SMALL_NUMBER && Number.isInteger(Number(n))) continue;
    issues.push(`number not in the facts: ${raw}`);
  }
  return issues;
}

export function writingIssues(text: string): string[] {
  const issues: string[] = [];
  if (LONG_DASH.test(text)) issues.push("long dash");
  if (EMOJI.test(text)) issues.push("emoji");
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) issues.push(`banned word: ${word}`);
  }
  return issues;
}

export function reasonIssues(reason: ExplainReason, input: ExplainInput): string[] {
  const issues: string[] = [];
  const facts = factNumbers(input);
  const allowed = new Set(input.placeholders);
  const domains = knownDomains(input);

  if (!reason.title.trim() || !reason.evidence.trim() || !reason.why_it_matters.trim()) issues.push("empty field");
  const steps = reason.steps.filter((s) => s.trim());
  if (steps.length < 2 || steps.length > 5) issues.push(`needs 2 to 5 steps, has ${steps.length}`);
  if (bracesIn(reason.title).length) issues.push("placeholder in title");
  if (bracesIn(reason.copy_for_claude).length) issues.push("placeholder in the Claude prompt");
  if (reason.fix_on_website && !reason.copy_for_claude.trim()) issues.push("website fix without a Claude prompt");

  const placed = [reason.evidence, reason.why_it_matters, ...steps].join("\n");
  for (const token of bracesIn(placed)) if (!allowed.has(token)) issues.push(`unknown placeholder: ${token}`);

  issues.push(...numberIssues([reason.title, reason.evidence, reason.why_it_matters].join("\n"), input, facts, false));
  issues.push(...numberIssues([...steps, reason.copy_for_claude].join("\n"), input, facts, true));

  const all = [reason.title, placed, reason.copy_for_claude].join("\n");
  for (const d of all.match(DOMAIN) ?? []) {
    const domain = d.toLowerCase().replace(/^www\./, "");
    if (!domains.has(domain)) issues.push(`website not in the facts: ${d}`);
  }
  issues.push(...writingIssues(all));
  return [...new Set(issues)];
}
