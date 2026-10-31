// Pure rules for every "can this agency do X?" question (D-60). The DAL loads the facts; no database here.

export type Entitlement = { allowed: boolean; reason: string };
export type LimitEntitlement = Entitlement & { limit: number | null };

export type AgencyFacts = {
  id: string;
  status: string;
  /** Set-up (not "onboarding"), not deleted businesses: drafts never count toward the trial limit (D-16). */
  businessCount: number;
  /** agency_credit_balance.balance: unexpired grants minus holds minus overdraft. */
  balance: number;
  /**
   * Still "trialing" after the trial end date: Stripe has not confirmed the first payment (its webhook is late or
   * never came). Nothing is spent until it does, top-ups included (2026-10-17).
   */
  trialOver: boolean;
  /**
   * The plan or trial has started: a Stripe subscription is linked, a trial end is saved, the status is past
   * "trialing", or it is a test agency (D-61, no card step). False while the first business is still being set up.
   */
  planStarted: boolean;
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
  /**
   * scan_job_business_on_plan (migration 050): false once the business's plan item is canceled. A business with no
   * plan item yet (a trial or test agency, a first business before its webhook) is on the plan.
   */
  onPlan: boolean;
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
  canceled: "Your plan has ended. Choose a plan to start it again.",
  readOnly: "Your plan has ended, so your account is read-only. Choose a plan to start it again.",
  paused: "Your account is paused. Contact support to turn it back on.",
  offPlan: "This business is off your plan.",
  trialOver: "Your free trial has ended. Scans start again once your first payment goes through.",
  setupUnfinished: "Finish setting up your first business to start your free trial. Then you can buy credits.",
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
  return statusBlock(agency.status) ?? (agency.trialOver ? deny(REASONS.trialOver) : allow);
}

/**
 * Buying a top-up: only once the plan or trial has started. Bought during setup, it made the Stripe customer the
 * trial checkout then refused (trialAllowed, F-43), so the card step could never start the free trial.
 */
export function canBuyTopUps(agency: AgencyFacts): Entitlement {
  if (!agency.planStarted) return deny(REASONS.setupUnfinished);
  return canSpendTopUps(agency);
}

/**
 * Changes to what the scans track (questions, competitors, models, business details). An ended plan is read-only
 * (MVP_SPEC 4.4); past due stays editable while Stripe retries the card, since editing spends nothing.
 */
export function canEditTracking(agency: Pick<AgencyFacts, "status">): Entitlement {
  if (agency.status === "canceled") return deny(REASONS.readOnly);
  if (agency.status === "past_due") return allow;
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
 * Finishing setup turns the agency's draft into a set-up business, so on a trial it must still fit the limit. While a
 * payment has failed it is refused too: setup cannot add the business to the subscription then (the plan change is
 * refused), so it would be set up and never billed. Scans have their own check.
 */
export function canFinishDraft(agency: AgencyFacts): Entitlement {
  if (agency.status === "past_due" || agency.status === "unpaid") return deny(REASONS.pastDue);
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
  // M1: a business taken off the plan keeps its data but is never scanned again, with top-ups or without.
  if (!business.onPlan) return deny(REASONS.offPlan);
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

export type PlanLimits = { name: string; maxQuestions: number | null; maxCompetitors: number | null };

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Whether a business already fits a smaller plan's limits before it moves there. A trial switch happens at once
 * (billing timingOf), so a business tracking more than the plan allows is asked to remove some first.
 */
export function fitsPlan(business: BusinessFacts, plan: PlanLimits): Entitlement {
  const over = (limit: number | null, used: number, what: string, page: string) =>
    limit !== null && used > limit
      ? deny(
          `${plan.name} tracks up to ${count(limit, what)} per business and this one has ${used}. Remove ${count(used - limit, what)} on the ${page} page, then move it to ${plan.name}.`,
        )
      : null;
  return (
    over(plan.maxCompetitors, business.competitorCount, "competitor", "Competitors") ??
    over(plan.maxQuestions, business.activeQuestionCount, "question", "Questions") ??
    allow
  );
}
