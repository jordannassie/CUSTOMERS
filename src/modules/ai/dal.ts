import "server-only";
// Live clients for the background AI jobs (D-84) and the logging that keeps a Claude outage visible: every failed
// attempt goes to provider_errors with its reason, the backup and an empty Anthropic account raise admin alerts,
// and usage is recorded with the provider and model that actually answered.
import { providerErrorKind } from "@/lib/provider-error-kind";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";
import { createAiClients, type AiClients } from "./clients";
import { CLAUDE_OUTAGE_MINUTES, claudeOutageMessage, describeFailure, type AiFailure, type AiFailureKind, type ClaudeOutageReason } from "./errors";
import type { AiReporter, AiSuccess } from "./structured";

export const ALERT_ANTHROPIC_CREDIT = "anthropic_credit";
export const ALERT_AI_FALLBACK = "ai_fallback";
export const ALERT_CLAUDE_UNAVAILABLE = "claude_unavailable";
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

/** Where the shared Claude outage is read and written; tests pass one in memory, so no shared alert opens. */
export type OutageHooks = {
  read: () => Promise<ClaudeOutageRow | null>;
  mark: (reason: ClaudeOutageReason, detail: string) => Promise<void>;
  clear: () => Promise<void>;
};
const liveOutage: OutageHooks = { read: () => readClaudeOutage(), mark: (r, d) => markClaudeOutage(r, d), clear: () => clearClaudeOutage() };

export function liveReporter(usage?: UsageContext, outage: OutageHooks = liveOutage): AiReporter {
  return {
    failure: (task, failure, fellBack) => recordFailure(task, failure, fellBack, outage),
    success: async (result) => {
      if (result.fellBack) await raiseAlert(ALERT_AI_FALLBACK, "warning", FALLBACK_MESSAGE, { task: result.task, primaryError: result.primaryError });
      // Claude answered, so an open outage is over (the read is this instance's one-minute copy).
      if (result.provider === "anthropic" && (await outage.read())) await outage.clear();
      if (usage) await recordAiUsage(usage, result);
    },
    claudeOutage: async () => {
      const open = await outage.read();
      if (!open?.reason || Date.now() - open.lastSeenAt.getTime() >= CLAUDE_OUTAGE_MINUTES * 60_000) return null;
      return { provider: "anthropic", model: "", kind: OUTAGE_KIND[open.reason], status: null, message: "Claude unavailable" };
    },
  };
}

// --- The Claude outage, shared by scans and background jobs: the open "claude_unavailable" admin alert (BUG-253).

export type ClaudeOutageRow = { since: Date; lastSeenAt: Date; reason: ClaudeOutageReason | null };

const OUTAGE_REASONS: ClaudeOutageReason[] = ["auth", "credit", "down"];
// Claude not answering a whole scan (BUG-285) reads as a server failure here: background jobs use the backup meanwhile.
const OUTAGE_KIND: Record<ClaudeOutageReason, AiFailureKind> = { auth: "auth", credit: "credit", down: "server" };

// Each server instance reads it at most once a minute; its own marks and clears update this copy at once.
let known: { at: number; outage: ClaudeOutageRow | null } | null = null;
const READ_EVERY_MS = 60_000;

/** The open outage, or null. `fresh` skips this instance's one-minute copy (scans read it once each). */
export async function readClaudeOutage(fresh = false): Promise<ClaudeOutageRow | null> {
  if (!fresh && known && Date.now() - known.at < READ_EVERY_MS) return known.outage;
  const { data, error } = await createServiceClient()
    .from("system_alerts")
    .select("created_at, last_seen_at, details")
    .eq("kind", ALERT_CLAUDE_UNAVAILABLE)
    .is("resolved_at", null)
    .maybeSingle();
  // Not knowing is not an outage: Claude is asked as usual.
  if (error) {
    console.error(`Could not read the Claude outage: ${error.message}`);
    return null;
  }
  const reason = (data?.details as { reason?: unknown } | null)?.reason;
  const outage: ClaudeOutageRow | null = data
    ? { since: new Date(data.created_at), lastSeenAt: new Date(data.last_seen_at), reason: OUTAGE_REASONS.find((r) => r === reason) ?? null }
    : null;
  known = { at: Date.now(), outage };
  return outage;
}

/** Opens the outage, or moves its last seen time on. */
export async function markClaudeOutage(reason: ClaudeOutageReason, detail: string): Promise<void> {
  const { error } = await createServiceClient().rpc("raise_system_alert", {
    p_kind: ALERT_CLAUDE_UNAVAILABLE,
    p_severity: "warning",
    p_message: claudeOutageMessage(reason),
    p_details: { reason, error: detail.slice(0, 300) },
  });
  if (error) console.error(`Could not mark Claude unavailable: ${error.message}`);
  const now = new Date();
  known = { at: Date.now(), outage: { since: known?.outage?.since ?? now, lastSeenAt: now, reason } };
}

/** Closes the outage: Claude answered again. */
export async function clearClaudeOutage(): Promise<void> {
  const { error } = await createServiceClient()
    .from("system_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("kind", ALERT_CLAUDE_UNAVAILABLE)
    .is("resolved_at", null);
  if (error) console.error(`Could not close the Claude outage: ${error.message}`);
  known = { at: Date.now(), outage: null };
}

async function recordFailure(task: string, failure: AiFailure, fellBack: boolean, outage: OutageHooks): Promise<void> {
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
  // A rejected key or no credit fails every Claude call the same way: scans and other jobs skip Claude for a while.
  if (failure.provider === "anthropic" && (failure.kind === "auth" || failure.kind === "credit")) {
    await outage.mark(failure.kind, describeFailure(failure));
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
