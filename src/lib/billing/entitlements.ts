/**
 * Server-side entitlement enforcement for Customers.Direct.
 *
 * THIS IS THE AUTHORITATIVE GATE for all plan-based feature access.
 * Every API route that creates usage MUST call these functions.
 * Never rely on hidden/disabled frontend buttons.
 *
 * All limits come from the canonical pricing config — never hardcoded here.
 */
import "server-only";
import { CANONICAL_PLANS, getPlanConfig, type CanonicalPlanId } from "@/config/pricing";
import { createServiceClient } from "@/lib/supabase/service";
import { betaFreeAccess } from "@/config/product-access";

export interface BusinessEntitlements {
  businessId: string;
  planId: CanonicalPlanId | "beta" | "none";
  planName: string;
  /** Max tracked prompts per business */
  maxPrompts: number;
  /** Max competitors per business */
  maxCompetitors: number;
  /** Number of AI models included */
  aiModelCount: number;
  /** Full scan cadence in days */
  scanCadenceDays: number;
  /** Daily priority prompt limit (Pro only) */
  dailyWatchPromptLimit: number;
  /** SEO intelligence level */
  seoIntelligence: string;
  /** Direct Agent level */
  directAgentLevel: string;
  /** History retention in months (-1 = unlimited) */
  historyMonths: number;
  /** Max agent messages per day */
  agentMessagesPerDay: number;
  /** Max Claude fixes per month */
  claudeFixesPerMonth: number;
  /** Billing status */
  status: string;
  /** True if the business has an active/trialing paid subscription */
  isActive: boolean;
  /** True if still in beta (no billing yet) */
  isBeta: boolean;
}

/**
 * Returns the server-authoritative entitlements for a business.
 * Uses service role to bypass RLS — must only be called server-side.
 */
export async function getBusinessEntitlements(businessId: string): Promise<BusinessEntitlements> {
  // During beta free access — every business gets Growth-level entitlements
  if (betaFreeAccess) {
    const growthPlan = CANONICAL_PLANS.growth;
    return {
      businessId,
      planId: "beta",
      planName: "Beta (Free)",
      maxPrompts: growthPlan.maxTrackedPrompts,
      maxCompetitors: growthPlan.maxCompetitors,
      aiModelCount: growthPlan.aiModelCount,
      scanCadenceDays: growthPlan.scanCadenceDays,
      dailyWatchPromptLimit: 0,
      seoIntelligence: growthPlan.seoIntelligence,
      directAgentLevel: growthPlan.directAgentLevel,
      historyMonths: growthPlan.historyMonths,
      agentMessagesPerDay: growthPlan.agentMessagesPerDay,
      claudeFixesPerMonth: growthPlan.claudeFixesPerMonth,
      status: "beta",
      isActive: true,
      isBeta: true,
    };
  }

  const svc = createServiceClient();
  const { data: item } = await svc
    .from("business_billing_items")
    .select("plan_id, status")
    .eq("business_id", businessId)
    .maybeSingle();

  const planId = (item?.plan_id ?? "none") as CanonicalPlanId | "beta" | "none";
  const status = item?.status ?? "inactive";

  // Beta businesses — use Growth-level beta limits
  if (planId === "beta" || status === "beta") {
    const growthPlan = CANONICAL_PLANS.growth;
    return {
      businessId,
      planId: "beta",
      planName: "Beta (Free)",
      maxPrompts: growthPlan.maxTrackedPrompts,
      maxCompetitors: growthPlan.maxCompetitors,
      aiModelCount: growthPlan.aiModelCount,
      scanCadenceDays: growthPlan.scanCadenceDays,
      dailyWatchPromptLimit: 0,
      seoIntelligence: growthPlan.seoIntelligence,
      directAgentLevel: growthPlan.directAgentLevel,
      historyMonths: growthPlan.historyMonths,
      agentMessagesPerDay: growthPlan.agentMessagesPerDay,
      claudeFixesPerMonth: growthPlan.claudeFixesPerMonth,
      status,
      isActive: true,
      isBeta: true,
    };
  }

  const isActive = status === "active" || status === "trialing";
  const plan = isActive && planId in CANONICAL_PLANS
    ? CANONICAL_PLANS[planId as CanonicalPlanId]
    : CANONICAL_PLANS.starter; // non-active → minimum starter limits

  return {
    businessId,
    planId: planId as CanonicalPlanId,
    planName: plan.name,
    maxPrompts: plan.maxTrackedPrompts,
    maxCompetitors: plan.maxCompetitors,
    aiModelCount: plan.aiModelCount,
    scanCadenceDays: plan.scanCadenceDays,
    dailyWatchPromptLimit: plan.dailyWatchPromptLimit,
    seoIntelligence: plan.seoIntelligence,
    directAgentLevel: plan.directAgentLevel,
    historyMonths: plan.historyMonths,
    agentMessagesPerDay: plan.agentMessagesPerDay,
    claudeFixesPerMonth: plan.claudeFixesPerMonth,
    status,
    isActive,
    isBeta: false,
  };
}

/** Can this business add another tracked prompt? */
export async function canAddPrompt(businessId: string, currentCount: number): Promise<boolean> {
  const ent = await getBusinessEntitlements(businessId);
  if (ent.maxPrompts === -1) return true;
  return currentCount < ent.maxPrompts;
}

/** Can this business add another competitor? */
export async function canAddCompetitor(businessId: string, currentCount: number): Promise<boolean> {
  const ent = await getBusinessEntitlements(businessId);
  if (ent.maxCompetitors === -1) return true;
  return currentCount < ent.maxCompetitors;
}

/** Can this business run a manual visibility scan? */
export async function canRunManualScan(businessId: string): Promise<{ allowed: boolean; reason?: string }> {
  const ent = await getBusinessEntitlements(businessId);
  if (!ent.isActive && !ent.isBeta) {
    return { allowed: false, reason: "No active subscription. Please subscribe to run scans." };
  }
  return { allowed: true };
}

/** Can this business use the Direct Agent? */
export async function canUseDirectAgent(businessId: string): Promise<boolean> {
  const ent = await getBusinessEntitlements(businessId);
  return ent.directAgentLevel !== "none";
}

/** Can this business use SEO / Search Intelligence features? */
export async function canUseSeoIntelligence(businessId: string): Promise<boolean> {
  const ent = await getBusinessEntitlements(businessId);
  return ent.seoIntelligence !== "none";
}

/** Returns the full scan cadence in days for a business (based on its plan). */
export async function getScanCadence(businessId: string): Promise<number> {
  const ent = await getBusinessEntitlements(businessId);
  return ent.scanCadenceDays;
}

/** Returns the max prompts for a scheduled scan run. */
export async function getMaxPromptsForScan(businessId: string): Promise<number> {
  const ent = await getBusinessEntitlements(businessId);
  return ent.maxPrompts === -1 ? 999 : ent.maxPrompts;
}

/** Returns the daily watch limit (Pro priority prompts). */
export async function getDailyWatchLimit(businessId: string): Promise<number> {
  const ent = await getBusinessEntitlements(businessId);
  return ent.dailyWatchPromptLimit;
}

/**
 * Can a new business be added to this account?
 * During trial: limit 1 business. After trial/active: unlimited.
 */
export async function canAddBusinessToAccount(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Beta mode — allow up to beta limit
  if (betaFreeAccess) {
    return { allowed: true };
  }

  const svc = createServiceClient();
  const { data: ba } = await svc
    .from("billing_accounts")
    .select("status, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ba) {
    // No billing account yet — allow first business
    return { allowed: true };
  }

  if (ba.status === "trialing") {
    // Count existing businesses
    const { count } = await svc
      .from("business_billing_items")
      .select("*", { count: "exact", head: true })
      .eq("billing_account_id", ba.status);

    if ((count ?? 0) >= 1) {
      return {
        allowed: false,
        reason: "During your trial you may only have 1 business. Subscribe to add more.",
      };
    }
  }

  return { allowed: true };
}
