import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/types/database.types";
import { findCachedAnswer, insertCheckUsage, upsertCachedAnswer } from "./dal";
import { CHECK_MODELS } from "./providers/models";
import type { CheckInput, CheckLocation, Citation, CheckUsage, ProviderId, RunCheck } from "./providers/types";

// Shared answer cache (MVP_SPEC 5.4, D-24). Shared across every business and agency; mentions are still detected per
// business on the cached answer. 20 hours, not 24 (H1): a scheduled scan lands at least MIN_SCAN_GAP_MS after the
// business's last scan (schedule.ts), so it never reuses, and pays again for, an answer that business already got.
// A Run scan within 20 hours of the last scan does reuse answers and is charged: the "Scan again?" dialog says so
// first (recent-scan.ts in jobs), and the scan history shows how many answers were reused.

export const CACHE_TTL_MS = 20 * 60 * 60 * 1000;

/** Lowercases, turns punctuation into spaces and collapses whitespace, so "Best dentist?" equals "best  dentist". */
export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function locationLabel(location: CheckLocation): string {
  return [location.city, location.region, location.country].map(normaliseText).join("|");
}

/** sha256 of model + normalised question + city/region/country. */
export function cacheKey(input: CheckInput): string {
  return createHash("sha256")
    .update([input.model, normaliseText(input.question), locationLabel(input.location)].join("\n"))
    .digest("hex");
}

const citationsSchema = z.array(z.object({ url: z.string(), title: z.string().nullable() }));

export type CheckAnswer = {
  answerText: string;
  citations: Citation[];
  /** Names the answer recommends (B-25); null until extraction has run on it. */
  extractedNames: Json | null;
  model: string;
  cached: boolean;
  /** Our real API cost for this check: 0 on a cache hit (MVP_SPEC 5.4). */
  costUsd: number;
  /** Null on a cache hit, since no call was made. */
  usage: CheckUsage | null;
  latencyMs: number;
  /** The cached row's created_at, so extracted names go onto this answer and not a newer one; unset when not cached. */
  cachedAt?: string;
};

export async function readCachedAnswer(input: CheckInput): Promise<CheckAnswer | null> {
  const row = await findCachedAnswer(cacheKey(input), new Date(Date.now() - CACHE_TTL_MS));
  if (!row) return null;
  return {
    answerText: row.answer,
    citations: citationsSchema.parse(row.citations),
    extractedNames: row.extractedNames,
    model: row.model,
    cached: true,
    costUsd: 0,
    usage: null,
    latencyMs: 0,
    cachedAt: row.createdAt,
  };
}

/** Returns the cached answer when one is younger than CACHE_TTL_MS, else calls the model and caches its answer. */
export async function checkWithCache(input: CheckInput, run: RunCheck): Promise<CheckAnswer> {
  const hit = await readCachedAnswer(input);
  if (hit) return hit;

  const result = await run(input);
  const cachedAt = await upsertCachedAnswer({
    cacheKey: cacheKey(input),
    model: result.model,
    question: input.question,
    location: locationLabel(input.location),
    answer: result.answerText,
    citations: result.citations,
    costUsd: result.costUsd,
  });
  return {
    answerText: result.answerText,
    citations: result.citations,
    extractedNames: null,
    model: result.model,
    cached: false,
    costUsd: result.costUsd,
    usage: result.usage,
    latencyMs: result.latencyMs,
    cachedAt,
  };
}

function providerOf(model: CheckInput["model"]): ProviderId {
  const entry = Object.entries(CHECK_MODELS).find(([, pinned]) => pinned === model);
  if (!entry) throw new Error(`Unknown check model: ${model}`);
  return entry[0] as ProviderId;
}

/** Writes the check's usage_events row: real cost on a call, cost 0 and cached = true on a hit. */
export async function recordCheckUsage(params: {
  accountUserId: string;
  businessId: string | null;
  input: CheckInput;
  answer: CheckAnswer;
}): Promise<void> {
  const { answer } = params;
  await insertCheckUsage({
    accountUserId: params.accountUserId,
    businessId: params.businessId,
    provider: providerOf(params.input.model),
    model: answer.model,
    inputTokens: answer.usage?.inputTokens ?? null,
    outputTokens: answer.usage?.outputTokens ?? null,
    costUsd: answer.cached ? 0 : answer.costUsd,
    cached: answer.cached,
  });
}
