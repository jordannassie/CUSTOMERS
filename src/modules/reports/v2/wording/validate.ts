// Code checks on each fix the AI rewrites (fix-wording.v1): the right shape and lengths, only numbers and websites
// the report states, the writing guide (docs/design/WRITING.md) and no promised results. A fix with any issue keeps
// its template text. The eval grader in evals/report-fix-wording runs these same checks. Pure.
// The word list and promise patterns are shared with the explanations (src/lib/writing-rules.ts).
import {
  MAX_STEPS,
  MIN_STEPS,
  STEP_MAX_CHARS,
  TITLE_MAX_CHARS,
  WHY_MAX_CHARS,
  WHY_MAX_SENTENCES,
  type FixWording,
} from "@/modules/reports/prompts/fix-wording.v1";
import { AI_NAMING_PROMISE, promiseIssues as sharedPromiseIssues, writingIssues as sharedWritingIssues } from "@/lib/writing-rules";
import type { ReportSnapshot } from "../snapshot-schema";
import { knownNames, NUMBER, normNumber, snapshotNumbers } from "./input";


const DOMAIN = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
// A full stop, question or exclamation mark that ends a sentence: followed by a capital, a digit or the end.
const SENTENCE_END = /[.!?](?=\s+["'(]?[A-Z0-9]|\s*$)/g;

/** The writing guide, plus no "!" in a fix. */
export function writingIssues(text: string): string[] {
  return sharedWritingIssues(text, { noExclamation: true });
}

/** No promised results, including "this will make AI name you". */
export function promiseIssues(text: string): string[] {
  return sharedPromiseIssues(text, [AI_NAMING_PROMISE]);
}

/** What every fix is checked against: the report's numbers, names and websites. */
export type WordingContext = { numbers: Set<string>; names: string[]; sites: Set<string> };

export function wordingContext(snapshot: ReportSnapshot): WordingContext {
  const text = JSON.stringify({ ...snapshot, agency: null }).toLowerCase();
  const sites = new Set((text.match(DOMAIN) ?? []).map((d) => d.replace(/^www\./, "")));
  return { numbers: snapshotNumbers(snapshot), names: knownNames(snapshot), sites };
}

/** Text with names and websites taken out, so names holding digits or full stops are not read as numbers or ends. */
function bare(text: string, ctx: WordingContext): string {
  let out = text.replace(DOMAIN, " site ");
  for (const name of ctx.names) out = out.split(name).join(" Name ");
  return out;
}

export function numberIssues(text: string, ctx: WordingContext): string[] {
  const out: string[] = [];
  for (const raw of bare(text, ctx).match(NUMBER) ?? []) {
    if (!ctx.numbers.has(normNumber(raw))) out.push(`number not in the report: ${raw}`);
  }
  return out;
}

export function siteIssues(text: string, ctx: WordingContext): string[] {
  const out: string[] = [];
  for (const d of text.match(DOMAIN) ?? []) {
    if (!ctx.sites.has(d.toLowerCase().replace(/^www\./, ""))) out.push(`website not in the report: ${d}`);
  }
  return out;
}

export function sentenceCount(text: string, ctx: WordingContext): number {
  const plain = bare(text.trim(), ctx);
  return Math.max(1, (plain.match(SENTENCE_END) ?? []).length);
}

// "Add Your Menu To Your Website": every longer word capitalised, once names are taken out.
function looksTitleCase(title: string, ctx: WordingContext): boolean {
  const words = bare(title, ctx)
    .replace(/\b(Name|AI|Google Business Profile|Google|ChatGPT|Claude|Perplexity|Yelp|TripAdvisor)\b/g, " ")
    .split(/\s+/)
    .slice(1)
    .filter((w) => /^[A-Za-z]{4,}$/.test(w));
  return words.length >= 2 && words.every((w) => /^[A-Z]/.test(w));
}

/** Every problem with one rewritten fix; empty means it can be kept. */
export function fixWordingIssues(w: FixWording, ctx: WordingContext): string[] {
  const issues: string[] = [];
  const title = w.title.trim();
  const why = w.why.trim();
  const steps = w.steps.map((s) => s.trim());

  if (!title || !why) issues.push("empty field");
  if (title.length > TITLE_MAX_CHARS) issues.push(`title over ${TITLE_MAX_CHARS} characters (${title.length})`);
  if (/[.\n]$/.test(title) || title.includes("\n")) issues.push("title ends with a full stop or has a line break");
  if (looksTitleCase(title, ctx)) issues.push("title is not in sentence case");
  if (why.length > WHY_MAX_CHARS) issues.push(`why over ${WHY_MAX_CHARS} characters`);
  if (sentenceCount(why, ctx) > WHY_MAX_SENTENCES) issues.push(`why has more than ${WHY_MAX_SENTENCES} sentences`);
  if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) issues.push(`needs ${MIN_STEPS} to ${MAX_STEPS} steps, has ${steps.length}`);
  steps.forEach((s, i) => {
    if (!s) issues.push(`step ${i + 1} is empty`);
    else if (s.length > STEP_MAX_CHARS || sentenceCount(s, ctx) > 1) issues.push(`step ${i + 1} is more than one sentence`);
  });

  const all = [title, why, ...steps].join("\n");
  issues.push(...numberIssues(all, ctx), ...siteIssues(all, ctx), ...writingIssues(all), ...promiseIssues(all));
  return [...new Set(issues)];
}
