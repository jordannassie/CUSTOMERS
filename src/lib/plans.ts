/**
 * @deprecated This file is a backward-compatibility shim.
 *
 * The old plan IDs (none / ai_visibility / growth_agent / autonomous_growth)
 * have been replaced by the canonical plan system (starter / growth / pro).
 *
 * Import from "@/config/pricing" instead.
 *
 * This file will be removed after all consumers are updated.
 */

export {
  CANONICAL_PLANS as PLANS,
  getPlanConfig as getPlan,
  isSelfServePlan as hasSelfServeCheckout,
  type CanonicalPlanId as PlanId,
  type CanonicalPlan as PlanConfig,
} from "@/config/pricing";

// Legacy PlanId type for any remaining old usages
export type LegacyPlanId = "none" | "ai_visibility" | "growth_agent" | "autonomous_growth";
