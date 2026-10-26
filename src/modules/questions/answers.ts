import { hostOf } from "@/lib/site-type";
import type { ProviderId } from "@/modules/scanning";
import { MODEL_LABELS } from "./service";

// "See the answers" on the Questions page (BUG-089): what each AI said the last time it was asked, and whether
// that answer named the business. Pure, so every case is unit tested. Only the fields the dialog shows leave here.

export type AnswerRecord = {
  provider: string;
  created_at: string;
  business_mentioned: boolean;
  competitors_mentioned: unknown;
  answer_text: string | null;
  /** Served from the shared answer cache (D-24) rather than asked again. */
  cached?: boolean | null;
  /** The name extractor's list (visibility_results.extracted_names). */
  extracted_names?: unknown;
  cited_sources?: unknown;
};

export type AnswerSite = { host: string; url: string };

export type QuestionAnswer = {
  model: ProviderId;
  label: string;
  checkedAt: string;
  namedYou: boolean;
  /** Tracked competitors this answer named. */
  competitors: string[];
  /** Other businesses it named, that you don't track. */
  others: string[];
  /** Websites the answer used, each once. */
  sites: AnswerSite[];
  text: string;
  /** The answer came from the answer cache, so this scan did not ask the AI again (2026-10-16). */
  reused: boolean;
};

// Long enough for any normal answer; a runaway one is cut so the dialog stays light.
export const ANSWER_MAX_CHARS = 6000;

/** Markdown marks read as noise in plain text: "**Bean House**" becomes "Bean House". */
export function plainAnswer(text: string): string {
  const plain = text
    .replace(/\r\n/g, "\n")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])([*_])(\S(?:[^\n]*?\S)?)\2(?=[\s).,;:!?]|$)/gm, "$1$3")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "$1 ($2)")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return plain.length > ANSWER_MAX_CHARS ? `${plain.slice(0, ANSWER_MAX_CHARS).trimEnd()}…` : plain;
}

function competitorNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) =>
    c && typeof c === "object" && typeof c.name === "string" && c.mentioned !== false ? [c.name as string] : [],
  );
}

const MAX_SITES = 8;

function otherNames(value: unknown, tracked: string[]): string[] {
  const names = value && typeof value === "object" && Array.isArray((value as { names?: unknown }).names) ? (value as { names: unknown[] }).names : [];
  const skip = new Set(tracked.map((n) => n.trim().toLowerCase()));
  const out: string[] = [];
  for (const n of names) {
    if (!n || typeof n !== "object" || typeof (n as { name?: unknown }).name !== "string" || (n as { matches?: unknown }).matches) continue;
    const name = (n as { name: string }).name.trim();
    if (name && !skip.has(name.toLowerCase())) {
      skip.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

function sitesOf(value: unknown): AnswerSite[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: AnswerSite[] = [];
  for (const c of value) {
    const url = c && typeof c === "object" && typeof c.url === "string" ? (c.url as string) : null;
    const host = url ? hostOf(url) : null;
    if (!url || !host || seen.has(host) || !/^https?:/i.test(url)) continue;
    seen.add(host);
    out.push({ host, url });
  }
  return out.slice(0, MAX_SITES);
}

/** The latest answer from each chosen model, in the business's model order. `rows` come newest first. */
export function latestAnswers(rows: AnswerRecord[], models: ProviderId[]): QuestionAnswer[] {
  return models.flatMap((model) => {
    const row = rows.find((r) => r.provider === model && r.answer_text?.trim());
    if (!row) return [];
    return [
      {
        model,
        label: MODEL_LABELS[model],
        checkedAt: row.created_at,
        namedYou: row.business_mentioned,
        competitors: competitorNames(row.competitors_mentioned),
        others: otherNames(row.extracted_names, competitorNames(row.competitors_mentioned)),
        sites: sitesOf(row.cited_sources),
        text: plainAnswer(row.answer_text!),
        reused: row.cached === true,
      },
    ];
  });
}
