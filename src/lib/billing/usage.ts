/**
 * Usage Ledger Service — Customers.Direct.
 *
 * Central service for recording all external API usage and costs.
 * EVERY paid external API call should go through this service.
 *
 * Usage types:
 *   ai_visibility_check  — AI provider call during a visibility scan
 *   direct_agent         — Direct Agent model call
 *   prompt_generation    — Claude prompt generation
 *   claude_fix           — Claude fix/implementation prompt
 *   dataforseo           — DataForSEO API request
 *   google_places        — Google Places API request
 *   report_generation    — Report generation call
 *   other                — Any other external API call
 *
 * NEVER expose internal cost data to client components.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { PROVIDER_COST_CONFIG } from "@/config/pricing";

export type UsageType =
  | "ai_visibility_check"
  | "direct_agent"
  | "prompt_generation"
  | "claude_fix"
  | "dataforseo"
  | "google_places"
  | "report_generation"
  | "other";

export interface RecordUsageParams {
  accountUserId: string;
  businessId?: string | null;
  usageType: UsageType;
  provider?: string | null;
  model?: string | null;
  quantity?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  requestCount?: number;
  /** Override automatic cost calculation if actual cost is known */
  estimatedCostUsd?: number;
  visibilityRunId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Estimates the cost of an AI provider call based on token counts.
 * Never exposed to customers — internal only.
 */
export function estimateProviderCost(
  provider: string,
  inputTokens: number,
  outputTokens: number
): number {
  const providerKey = provider.toLowerCase().replace(/[^a-z]/g, "_") as keyof typeof PROVIDER_COST_CONFIG;
  const costs =
    PROVIDER_COST_CONFIG[providerKey] ??
    PROVIDER_COST_CONFIG.default;

  if (!("inputPer1kTokens" in costs)) return 0;

  const inputCost = (inputTokens / 1000) * costs.inputPer1kTokens;
  const outputCost = (outputTokens / 1000) * costs.outputPer1kTokens;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
}

/**
 * Estimates the cost of a DataForSEO or Google Places request.
 */
export function estimateServiceCost(
  serviceType: "dataforseo" | "google_places",
  requestCount: number
): number {
  const config = PROVIDER_COST_CONFIG[serviceType];
  return Math.round(requestCount * config.perRequest * 1_000_000) / 1_000_000;
}

/**
 * Records a usage event to the usage_events ledger.
 * Fails silently (logs error but does not throw) to avoid blocking core functionality.
 */
export async function recordUsage(params: RecordUsageParams): Promise<void> {
  try {
    const svc = createServiceClient();

    let estimatedCostUsd = params.estimatedCostUsd ?? 0;

    // Auto-calculate cost if not provided
    if (params.estimatedCostUsd === undefined) {
      if (params.inputTokens && params.outputTokens && params.provider) {
        estimatedCostUsd = estimateProviderCost(
          params.provider,
          params.inputTokens,
          params.outputTokens
        );
      } else if (params.usageType === "dataforseo") {
        estimatedCostUsd = estimateServiceCost("dataforseo", params.requestCount ?? 1);
      } else if (params.usageType === "google_places") {
        estimatedCostUsd = estimateServiceCost("google_places", params.requestCount ?? 1);
      }
    }

    await svc.from("usage_events").insert({
      account_user_id: params.accountUserId,
      business_id: params.businessId ?? null,
      usage_type: params.usageType,
      provider: params.provider ?? null,
      model: params.model ?? null,
      quantity: params.quantity ?? 1,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      request_count: params.requestCount ?? 1,
      estimated_cost_usd: estimatedCostUsd,
      visibility_run_id: params.visibilityRunId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Never throw — usage recording failure must not block core functionality
    console.error("[usage] Failed to record usage event:", err);
  }
}

/**
 * Records multiple AI visibility checks (one per prompt × provider execution).
 * Called from the visibility runner after each scan.
 */
export async function recordVisibilityChecks(params: {
  accountUserId: string;
  businessId: string;
  visibilityRunId: string;
  provider: string;
  model?: string;
  promptCount: number;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  await recordUsage({
    accountUserId: params.accountUserId,
    businessId: params.businessId,
    usageType: "ai_visibility_check",
    provider: params.provider,
    model: params.model,
    quantity: params.promptCount,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    requestCount: params.promptCount,
    visibilityRunId: params.visibilityRunId,
    metadata: {
      prompt_count: params.promptCount,
    },
  });
}

/**
 * Records a Direct Agent model call.
 */
export async function recordDirectAgentUsage(params: {
  accountUserId: string;
  businessId: string;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  await recordUsage({
    accountUserId: params.accountUserId,
    businessId: params.businessId,
    usageType: "direct_agent",
    provider: params.provider,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });
}

/**
 * Records a DataForSEO request.
 */
export async function recordDataForSeoUsage(params: {
  accountUserId: string;
  businessId?: string;
  requestCount?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordUsage({
    accountUserId: params.accountUserId,
    businessId: params.businessId,
    usageType: "dataforseo",
    provider: "dataforseo",
    requestCount: params.requestCount ?? 1,
    metadata: params.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin queries — internal only
// ─────────────────────────────────────────────────────────────────────────────

export interface UsageSummary {
  totalCostUsd: number;
  totalAiChecks: number;
  totalVisibilityRuns: number;
  byProvider: Record<string, {
    provider: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  }>;
  byUsageType: Record<string, {
    usageType: string;
    requests: number;
    estimatedCostUsd: number;
  }>;
}

/** Admin: Get usage summary for a date range. */
export async function adminGetUsageSummary(opts: {
  startDate: Date;
  endDate: Date;
  businessId?: string;
  accountUserId?: string;
}): Promise<UsageSummary> {
  const svc = createServiceClient();
  const query = svc
    .from("usage_events")
    .select("usage_type, provider, quantity, input_tokens, output_tokens, request_count, estimated_cost_usd")
    .gte("created_at", opts.startDate.toISOString())
    .lte("created_at", opts.endDate.toISOString());

  if (opts.businessId) query.eq("business_id", opts.businessId);
  if (opts.accountUserId) query.eq("account_user_id", opts.accountUserId);

  const { data } = await query;
  const events = data ?? [];

  const byProvider: UsageSummary["byProvider"] = {};
  const byUsageType: UsageSummary["byUsageType"] = {};
  let totalCostUsd = 0;
  let totalAiChecks = 0;
  let totalVisibilityRuns = 0;

  for (const e of events) {
    totalCostUsd += Number(e.estimated_cost_usd ?? 0);

    if (e.usage_type === "ai_visibility_check") {
      totalAiChecks += e.quantity ?? 1;
      totalVisibilityRuns += 1;
    }

    if (e.provider) {
      if (!byProvider[e.provider]) {
        byProvider[e.provider] = { provider: e.provider, requests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
      }
      byProvider[e.provider].requests += e.request_count ?? 1;
      byProvider[e.provider].inputTokens += Number(e.input_tokens ?? 0);
      byProvider[e.provider].outputTokens += Number(e.output_tokens ?? 0);
      byProvider[e.provider].estimatedCostUsd += Number(e.estimated_cost_usd ?? 0);
    }

    if (!byUsageType[e.usage_type]) {
      byUsageType[e.usage_type] = { usageType: e.usage_type, requests: 0, estimatedCostUsd: 0 };
    }
    byUsageType[e.usage_type].requests += e.request_count ?? 1;
    byUsageType[e.usage_type].estimatedCostUsd += Number(e.estimated_cost_usd ?? 0);
  }

  return { totalCostUsd, totalAiChecks, totalVisibilityRuns, byProvider, byUsageType };
}
