import "server-only";
// Live clients for the background AI jobs (D-84) and the logging that keeps a Claude outage visible: every failed
// attempt goes to provider_errors with its reason, the backup and an empty Anthropic account raise admin alerts,
// and usage is recorded with the provider and model that actually answered.
import { providerErrorKind } from "@/lib/provider-error-kind";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";
import { createAiClients, type AiClients } from "./clients";
import { describeFailure, type AiFailure } from "./errors";
import type { AiReporter, AiSuccess } from "./structured";

export const ALERT_ANTHROPIC_CREDIT = "anthropic_credit";
export const ALERT_AI_FALLBACK = "ai_fallback";
const CREDIT_MESSAGE =
  "Anthropic out of credit. Top it up at console.anthropic.com (Plans & Billing). Claude checks fail until then; background jobs use the ChatGPT backup.";
const FALLBACK_MESSAGE = "Claude unavailable, using ChatGPT backup.";

/** Who to charge the cost record to; without it usage is left to the caller (scans and explanations record their own). */
export type UsageContext = {
  accountUserId: string;
  businessId: string | null;
  usageType?: "other" | "prompt_generation";
};

export function liveAiClients(usage?: UsageContext): AiClients {
  return createAiClients({
    anthropicKey: env.ANTHROPIC_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
    fallbackEnabled: env.AI_FALLBACK_ENABLED !== "false",
    backupFast: env.AI_FALLBACK_MODEL_FAST,
    backupSmart: env.AI_FALLBACK_MODEL_SMART,
    report: liveReporter(usage),
  });
}

export function liveReporter(usage?: UsageContext): AiReporter {
  return {
    failure: (task, failure, fellBack) => recordFailure(task, failure, fellBack),
    success: async (result) => {
      if (result.fellBack) await raiseAlert(ALERT_AI_FALLBACK, "warning", FALLBACK_MESSAGE, { task: result.task, primaryError: result.primaryError });
      if (usage) await recordAiUsage(usage, result);
    },
  };
}

async function recordFailure(task: string, failure: AiFailure, fellBack: boolean): Promise<void> {
  const line = `${task}: ${describeFailure(failure)}${fellBack ? " (used the ChatGPT backup)" : ""}`;
  // Our own bad request is a bug in this code, not an outage: no backup, and it says so in the log.
  if (failure.kind === "bad_request") console.error(`AI request bug, ${line}`);
  else console.warn(`AI failure, ${line}`);
  const message = (failure.kind === "bad_request" ? `Bug: ${line}` : line).slice(0, 500);
  // One row per kind of failure an hour, with a count (migration 058).
  const { error } = await createServiceClient().rpc("record_provider_error", { p_provider: failure.provider, p_kind: providerErrorKind(message), p_message: message });
  if (error) console.error(`Could not record the AI failure: ${error.message}`);
  if (failure.provider === "anthropic" && failure.kind === "credit") {
    await raiseAlert(ALERT_ANTHROPIC_CREDIT, "critical", CREDIT_MESSAGE, { task, status: failure.status });
  }
}

/** One usage_events row for a background job, with the provider and model that answered. */
export async function recordAiUsage(usage: UsageContext, result: AiSuccess): Promise<void> {
  const { error } = await createServiceClient()
    .from("usage_events")
    .insert({
      account_user_id: usage.accountUserId,
      business_id: usage.businessId,
      usage_type: usage.usageType ?? "other",
      provider: result.provider,
      model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      request_count: 1,
      estimated_cost_usd: result.costUsd,
      metadata: aiUsageMetadata(result),
    });
  if (error) console.error(`Could not record AI usage for ${result.task}: ${error.message}`);
}

/** What usage_events.metadata says about a background job: which job, and whether the backup answered. */
export function aiUsageMetadata(result: Pick<AiSuccess, "task" | "fellBack" | "primaryError">): Json {
  return result.fellBack
    ? { task: result.task, fellBack: true, primaryError: result.primaryError }
    : { task: result.task, fellBack: false };
}

// raise_system_alert keeps one open alert per kind and refreshes it; once a minute per instance is plenty.
const lastRaised = new Map<string, number>();

async function raiseAlert(kind: string, severity: "warning" | "critical", message: string, details: Record<string, Json>): Promise<void> {
  const now = Date.now();
  if ((lastRaised.get(kind) ?? 0) > now - 60_000) return;
  lastRaised.set(kind, now);
  const { error } = await createServiceClient().rpc("raise_system_alert", {
    p_kind: kind,
    p_severity: severity,
    p_message: message,
    p_details: details,
  });
  if (error) console.error(`Could not raise the ${kind} alert: ${error.message}`);
}
