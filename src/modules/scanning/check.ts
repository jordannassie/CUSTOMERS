import "server-only";
// One check inside a scan (MVP_SPEC 5.2): answer (cache or model), mentions, names, saved result.
// Charging is left to the scan, which captures a credit only for a check that returns ok.
import { createHash } from "node:crypto";
import type { Json } from "@/types/database.types";
import { cacheKey, checkWithCache, recordCheckUsage, type CheckAnswer } from "./cache";
import { readStoredExtraction, toStoredExtraction, type ExtractNames, type StoredExtraction } from "./extract";
import { matchNames } from "./extract-match";
import { storeExtraction } from "./extract-store";
import { detectMentions, type MentionTarget } from "./mentions";
import { CHECK_MODELS } from "./providers/models";
import type { CheckInput, CheckLocation, ProviderId, RunCheck } from "./providers/types";
import { insertExtractionUsage, saveCheckResult } from "./runs/dal";

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

export type CheckOutcome = { ok: true } | { ok: false; error: string };

/** Same job, question and model always give the same id, so a retried job can never charge a check twice. */
export function checkIdFor(jobId: string, promptId: string, provider: ProviderId): string {
  const hex = createHash("sha256").update(`${jobId}:${promptId}:${provider}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function runOneCheck(task: CheckTask, ctx: CheckContext): Promise<CheckOutcome> {
  if (!ctx.runner) return { ok: false, error: `${task.provider} is not set up (no API key)` };
  const input: CheckInput = { question: task.question, location: ctx.location, model: CHECK_MODELS[task.provider] };

  let answer: CheckAnswer;
  try {
    answer = ctx.isTest ? await recordedAnswer(input, ctx.runner) : await checkWithCache(input, ctx.runner);
    if (!ctx.isTest) {
      await recordCheckUsage({ accountUserId: ctx.ownerUserId, businessId: ctx.businessId, input, answer });
    }
  } catch (err) {
    // A failed check is never charged (D-53), whatever the reason.
    return { ok: false, error: `${task.provider}: ${err instanceof Error ? err.message : String(err)}` };
  }

  const mentions = detectMentions(answer.answerText, ctx.business, ctx.competitors);
  const extraction = await namesFor(input, answer, ctx);

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
    extractedNames: extraction
      ? ({
          promptVersion: extraction.promptVersion,
          names: matchNames(extraction.names, ctx.business, ctx.competitors),
        } as Json)
      : null,
    cached: answer.cached,
    costUsd: answer.costUsd,
    latencyMs: answer.latencyMs,
  });
  return { ok: true };
}

async function recordedAnswer(input: CheckInput, runner: RunCheck): Promise<CheckAnswer> {
  const result = await runner(input);
  return { ...result, extractedNames: null, cached: false };
}

// Names are stored on the cached answer, so a cache hit reuses them; a failed extraction only loses the names.
async function namesFor(input: CheckInput, answer: CheckAnswer, ctx: CheckContext): Promise<StoredExtraction | null> {
  const stored = readStoredExtraction(answer.extractedNames);
  if (stored || !ctx.extractNames) return stored;
  try {
    const extraction = await ctx.extractNames(answer.answerText);
    if (!ctx.isTest) {
      await storeExtraction(cacheKey(input), extraction);
      await insertExtractionUsage({
        accountUserId: ctx.ownerUserId,
        businessId: ctx.businessId,
        model: extraction.model,
        inputTokens: extraction.usage.inputTokens,
        outputTokens: extraction.usage.outputTokens,
        costUsd: extraction.costUsd,
      });
    }
    return toStoredExtraction(extraction);
  } catch {
    return null;
  }
}
