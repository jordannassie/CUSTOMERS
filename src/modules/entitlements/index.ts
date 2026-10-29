import "server-only";
import { isCountedBusiness, loadAgencyFacts, loadBusinessFacts, loadPlanLimits } from "./dal";
import * as rules from "./service";
import type { Entitlement, LimitEntitlement } from "./service";

// The one place that answers "can this agency do X?" (D-60). Every action that spends credits or adds
// data calls one of these after its auth guard, and shows `reason` when `allowed` is false.

/**
 * Only set-up businesses count (D-16): the agency's draft never blocks it. `businessId`: an existing business being put
 * on the plan (B-44). A set-up one is already in the count, so it is not counted twice; a draft is not, so it is checked
 * like finishing it (canFinishDraft) and a full trial refuses it.
 */
export async function canAddBusiness(agencyId: string, options: { businessId?: string } = {}): Promise<Entitlement> {
  const [facts, counted] = await Promise.all([
    loadAgencyFacts(agencyId),
    options.businessId ? isCountedBusiness(agencyId, options.businessId) : Promise.resolve(false),
  ]);
  const businessCount = counted ? Math.max(0, facts.businessCount - 1) : facts.businessCount;
  return rules.canAddBusiness({ ...facts, businessCount });
}

/** Call before setup finishes a draft: a trial with 2 set-up businesses cannot turn a third one on. */
export async function canFinishDraft(agencyId: string): Promise<Entitlement> {
  return rules.canFinishDraft(await loadAgencyFacts(agencyId));
}

/** Call before queueing a scan (B-29) and again in the worker right before holdCredits (B-26, F-20). */
export async function canStartScan(agencyId: string, businessId: string): Promise<Entitlement> {
  const [agency, business] = await Promise.all([loadAgencyFacts(agencyId), loadBusinessFacts(businessId)]);
  return rules.canStartScan(agency, business);
}

/** The worker's check right before holdCredits (B-26): the claimed job is itself the open scan, so it is not counted. */
export async function canRunScanJob(agencyId: string, businessId: string): Promise<Entitlement> {
  const [agency, business] = await Promise.all([loadAgencyFacts(agencyId), loadBusinessFacts(businessId)]);
  return rules.canStartScan(agency, { ...business, hasOpenScan: false });
}

export async function canSpendTopUps(agencyId: string): Promise<Entitlement> {
  return rules.canSpendTopUps(await loadAgencyFacts(agencyId));
}

/** Call before selling a top-up and on Buy credits: refused until the plan or trial has started (setup finished). */
export async function canBuyTopUps(agencyId: string): Promise<Entitlement> {
  return rules.canBuyTopUps(await loadAgencyFacts(agencyId));
}

export async function maxQuestions(businessId: string): Promise<LimitEntitlement> {
  return rules.maxQuestions(await loadBusinessFacts(businessId));
}

export async function maxCompetitors(businessId: string): Promise<LimitEntitlement> {
  return rules.maxCompetitors(await loadBusinessFacts(businessId));
}

/** Before a business moves to a smaller plan: refused while it tracks more competitors or questions than that plan has. */
export async function fitsPlan(businessId: string, planId: string): Promise<Entitlement> {
  const [business, plan] = await Promise.all([loadBusinessFacts(businessId), loadPlanLimits(planId)]);
  return rules.fitsPlan(business, plan);
}

export { canEditTracking, REASONS, TRIAL_MAX_BUSINESSES, type Entitlement, type LimitEntitlement } from "./service";
