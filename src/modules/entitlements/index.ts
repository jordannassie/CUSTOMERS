import "server-only";
import { loadAgencyFacts, loadBusinessFacts } from "./dal";
import * as rules from "./service";
import type { Entitlement, LimitEntitlement } from "./service";

// The one place that answers "can this agency do X?" (D-60). Every action that spends credits or adds
// data calls one of these after its auth guard, and shows `reason` when `allowed` is false.

export async function canAddBusiness(agencyId: string): Promise<Entitlement> {
  return rules.canAddBusiness(await loadAgencyFacts(agencyId));
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

export async function maxQuestions(businessId: string): Promise<LimitEntitlement> {
  return rules.maxQuestions(await loadBusinessFacts(businessId));
}

export async function maxCompetitors(businessId: string): Promise<LimitEntitlement> {
  return rules.maxCompetitors(await loadBusinessFacts(businessId));
}

export { REASONS, TRIAL_MAX_BUSINESSES, type Entitlement, type LimitEntitlement } from "./service";
