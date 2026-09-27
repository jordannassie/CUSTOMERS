// Pure rules for every "can this agency do X?" question (D-60). The DAL loads the facts; no database here.

export type Entitlement = { allowed: boolean; reason: string };
export type LimitEntitlement = Entitlement & { limit: number | null };

export type AgencyFacts = {
  id: string;
  status: string;
  businessCount: number;
  /** agency_credit_balance.balance: unexpired grants minus holds minus overdraft. */
  balance: number;
};

export type BusinessFacts = {
  id: string;
  agencyId: string | null;
  planName: string;
  /** Null means the plan sets no limit (Enterprise, custom). */
  maxQuestions: number | null;
  maxCompetitors: number | null;
  activeQuestionCount: number;
  competitorCount: number;
  /** A queued or running scan job exists (D-55 allows one). */
  hasOpenScan: boolean;
};

// D-16: the trial covers 2 businesses.
export const TRIAL_MAX_BUSINESSES = 2;

export const REASONS = {
  ok: "",
  trialBusinessLimit: `Your trial includes ${TRIAL_MAX_BUSINESSES} businesses. Upgrade to add more.`,
  outOfCredits: "You're out of credits. Buy a top-up or upgrade.",
  scanAlreadyQueued: "A scan is already running. You can start another when it finishes.",
  notYourBusiness: "This business is not in your account.",
  pastDue: "Your last payment didn't go through. Update your card to continue.",
  canceled: "Your plan has ended. Choose a plan to continue.",
  paused: "Your account is paused, contact support.",
} as const;

const allow: Entitlement = { allowed: true, reason: REASONS.ok };
const deny = (reason: string): Entitlement => ({ allowed: false, reason });

function statusBlock(status: string): Entitlement | null {
  if (status === "trialing" || status === "active") return null;
  if (status === "past_due") return deny(REASONS.pastDue);
  if (status === "canceled") return deny(REASONS.canceled);
  return deny(REASONS.paused);
}

/** Top-up credits are spendable only with an active plan or trial (MVP_SPEC 4.2, D-57, F-20). */
export function canSpendTopUps(agency: AgencyFacts): Entitlement {
  return statusBlock(agency.status) ?? allow;
}

export function canAddBusiness(agency: AgencyFacts): Entitlement {
  const blocked = statusBlock(agency.status);
  if (blocked) return blocked;
  if (agency.status === "trialing" && agency.businessCount >= TRIAL_MAX_BUSINESSES) {
    return deny(REASONS.trialBusinessLimit);
  }
  return allow;
}

/**
 * Checked by the Run scan action (B-29) and again by the worker right before hold_credits (B-26).
 * The status check is what keeps top-ups unspendable without a plan or trial: hold_credits spends any grant.
 */
export function canStartScan(agency: AgencyFacts, business: BusinessFacts): Entitlement {
  if (business.agencyId !== agency.id) return deny(REASONS.notYourBusiness);
  const blocked = canSpendTopUps(agency);
  if (!blocked.allowed) return blocked;
  // D-54: no new scan at 0 or below.
  if (agency.balance <= 0) return deny(REASONS.outOfCredits);
  if (business.hasOpenScan) return deny(REASONS.scanAlreadyQueued);
  return allow;
}

function limitCheck(limit: number | null, used: number, what: string, planName: string): LimitEntitlement {
  if (limit === null || used < limit) return { allowed: true, reason: REASONS.ok, limit };
  return {
    allowed: false,
    reason: `Your ${planName} plan includes ${limit} ${what} per business. Upgrade or remove one to add another.`,
    limit,
  };
}

/** Whether one more active question fits the business's plan (plans.max_questions). */
export function maxQuestions(business: BusinessFacts): LimitEntitlement {
  return limitCheck(business.maxQuestions, business.activeQuestionCount, "questions", business.planName);
}

/** Whether one more competitor fits the business's plan (plans.max_competitors). */
export function maxCompetitors(business: BusinessFacts): LimitEntitlement {
  return limitCheck(business.maxCompetitors, business.competitorCount, "competitors", business.planName);
}
