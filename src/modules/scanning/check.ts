import "server-only";
// One check inside a scan (MVP_SPEC 5.2): answer (cache or model), mentions, names, saved result.
// Charging is left to the scan, which captures a credit only for a check that returns ok with a new answer.
import { createHash } from "node:crypto";
import type { Json } from "@/types/database.types";
import { cacheKey, checkWithCache, recordCheckUsage, type CheckAnswer } from "./cache";
import { outageReason, type OutageReason } from "./claude-outage/outage";
import { readStoredExtraction, toStoredExtraction, type Extraction, type ExtractNames, type StoredExtraction } from "./extract";
import { matchNames } from "./extract-match";
import { storeExtraction } from "./extract-store";
import { mergeMentions } from "./mention-merge";
import { detectMentions, type MentionTarget } from "./mentions";
import { CHECK_MODELS } from "./providers/models";
import { ProviderError, retriedInside, type ProviderErrorKind } from "./providers/request";
import type { CheckInput, CheckLocation, ProviderId, RunCheck } from "./providers/types";
import { insertExtractionUsage, recordProviderError, saveCheckResult } from "./runs/dal";

export type CheckTask = { checkId: string; promptId: string; provider: ProviderId; question: string };

export type CheckContext = {
  runId: string;
  businessId: string;
  ownerUserId: string;
  business: MentionTarget;
  competitors: MentionTarget[];
  location: CheckLocation;
  /** is_test agencies: recorded answers, kept out of the shared cache and usage costs (D-61). */
  isTest: boolean;
  runner: RunCheck | null;
  extractNames: ExtractNames | null;
};

/**
 * `cached`: the answer came from the shared answer cache, so the check is free (D-24, 2026-10-20).
 * `outage`: Claude failed for a reason every other Claude check would share (a rejected key, no credit).
 * `kind`: how the provider call failed, when it was a provider error (a server error, a timeout).
 */
export type CheckOutcome =
  | { ok: true; cached: boolean }
  | { ok: false; error: string; reason: string; outage?: OutageReason; kind?: ProviderErrorKind };

/** Same job, question and model always give the same id, so a retried job can never charge a check twice. */
export function checkIdFor(jobId: string, promptId: string, provider: ProviderId): string {
  const hex = createHash("sha256").update(`${jobId}:${promptId}:${provider}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function runOneCheck(task: CheckTask, ctx: CheckContext): Promise<CheckOutcome> {
  if (!ctx.runner) {
    return { ok: false, error: `${task.provider} is not set up (no API key)`, reason: "not set up (no API key)" };
  }
  const input: CheckInput = { question: task.question, location: ctx.location, model: CHECK_MODELS[task.provider] };

  // Only the provider call can fail the check as an AI failure: the answer cache already turns its own database
  // errors into a miss or an uncached answer (cache.ts), so a database error is never logged as the AI's (BUG-281).
  let answer: CheckAnswer;
  try {
    answer = await answerWithOneRetry(input, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Recorded answers are not provider calls, so test agencies never count toward the error spike alert (B-69).
    if (!ctx.isTest) await recordProviderError(task.provider, message);
    // A failed check is never charged (D-53), whatever the reason.
    const outage = outageReason(err);
    const kind = err instanceof ProviderError ? err.kind : undefined;
    return { ok: false, error: `${task.provider}: ${message}`, reason: message, ...(outage ? { outage } : {}), ...(kind ? { kind } : {}) };
  }
  // Outside the try: a database error here throws out of the scan like saveCheckResult's, and the worker runs the job
  // again. The answer is normally cached by then, so the retry asks no model.
  if (!ctx.isTest) await recordCheckUsage({ accountUserId: ctx.ownerUserId, businessId: ctx.businessId, input, answer });

  const extraction = await namesFor(input, answer, ctx);
  const matched = extraction ? matchNames(extraction.names, ctx.business, ctx.competitors) : null;
  const detected = detectMentions(answer.answerText, ctx.business, ctx.competitors);
  const mentions = mergeMentions(answer.answerText, detected, matched);

  await saveCheckResult({
    id: task.checkId,
    runId: ctx.runId,
    businessId: ctx.businessId,
    trackedPromptId: task.promptId,
    provider: task.provider,
    model: answer.model,
    question: task.question,
    answerText: answer.answerText,
    businessMentioned: mentions.business.mentioned,
    mentionPosition: mentions.business.position,
    competitorsMentioned: mentions.competitors
      .filter((c) => c.mentioned)
      .map((c) => ({ name: c.name, position: c.position })),
    citations: answer.citations,
    extractedNames: extraction ? ({ promptVersion: extraction.promptVersion, names: matched } as Json) : null,
    cached: answer.cached,
    costUsd: answer.costUsd,
    latencyMs: answer.latencyMs,
    isSample: ctx.isTest,
  });
  return { ok: true, cached: answer.cached };
}

// A timeout or an unfinished search often clears in seconds; one more try beats failing the check (BUG-083). Rate
// limits, server and network errors were already tried again inside the provider call (withRetries), so they are not
// wrapped in a second round. A check that still fails is not charged (D-53).
async function answerWithOneRetry(input: CheckInput, ctx: CheckContext): Promise<CheckAnswer> {
  const ask = () => (ctx.isTest ? recordedAnswer(input, ctx.runner!) : checkWithCache(input, ctx.runner!));
  try {
    return await ask();
  } catch (err) {
    if (!(err instanceof ProviderError) || !err.retryable || retriedInside(err.kind)) throw err;
    return ask();
  }
}

async function recordedAnswer(input: CheckInput, runner: RunCheck): Promise<CheckAnswer> {
  const result = await runner(input);
  return { ...result, extractedNames: null, cached: false };
}

// Names are stored on the cached answer, so a cache hit reuses them; a failed extraction only loses the names.
async function namesFor(input: CheckInput, answer: CheckAnswer, ctx: CheckContext): Promise<StoredExtraction | null> {
  const stored = readStoredExtraction(answer.extractedNames);
  if (stored || !ctx.extractNames) return stored;
  let extraction: Extraction;
  try {
    extraction = await ctx.extractNames(answer.answerText);
  } catch {
    // Both Claude and the ChatGPT backup failed; the AI reporter already logged why to provider_errors (D-84).
    return null;
  }
  if (!ctx.isTest) {
    // Onto the answer it came from only: a newer answer under the same key keeps its own names (or none yet).
    // A database error keeps the names for this check; the next check on this answer extracts them again.
    if (answer.cachedAt) {
      await storeExtraction(cacheKey(input), answer.cachedAt, extraction).catch((err) =>
        console.error(`check ${ctx.runId}: could not save the names on the cached answer: ${errorText(err)}`),
      );
    }
    await insertExtractionUsage({
      accountUserId: ctx.ownerUserId,
      businessId: ctx.businessId,
      model: extraction.model,
      inputTokens: extraction.usage.inputTokens,
      outputTokens: extraction.usage.outputTokens,
      costUsd: extraction.costUsd,
      provider: extraction.provider,
      fellBack: extraction.fellBack,
      primaryError: extraction.primaryError,
    }).catch((err) => console.error(`check ${ctx.runId}: could not record the name extraction cost: ${errorText(err)}`));
  }
  return toStoredExtraction(extraction);
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
