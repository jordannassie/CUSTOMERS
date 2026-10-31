import { trialAllowed } from "../checkout";
import type { PlanPrice } from "../dal";

// Pure rules for the Choose plan page (BUG-079, BUG-066). An agency with a live subscription changes plans on the
// Billing page; this page is for an agency with no plan yet, or whose plan ended.

export type ChoosePlanRows = {
  agency: { status: string; customerId: string | null; subscriptionId: string | null };
  /** Set-up businesses, oldest first; each gets one subscription item (D-56). */
  businesses: { id: string; name: string }[];
  plans: PlanPrice[];
};

export type ChoosePlanState =
  | { kind: "has_plan" }
  | { kind: "no_business" }
  | {
      kind: "choose";
      ended: boolean;
      trial: boolean;
      businessCount: number;
      plans: { id: string; name: string; priceCents: number; monthlyCredits: number; maxCompetitors: number | null; maxQuestions: number | null }[];
    };

/** Same rule as the Billing page: a linked subscription that has not ended is a plan. */
export function hasLivePlan(agency: ChoosePlanRows["agency"]): boolean {
  return agency.subscriptionId !== null && agency.status !== "canceled";
}

export function choosePlanState(rows: ChoosePlanRows): ChoosePlanState {
  if (hasLivePlan(rows.agency)) return { kind: "has_plan" };
  if (rows.businesses.length === 0) return { kind: "no_business" };
  return {
    kind: "choose",
    ended: rows.agency.status === "canceled",
    trial: trialAllowed({ stripeCustomerId: rows.agency.customerId, stripeSubscriptionId: rows.agency.subscriptionId }),
    businessCount: rows.businesses.length,
    plans: rows.plans.map(({ id, name, priceCents, monthlyCredits, maxCompetitors, maxQuestions }) => ({
      id,
      name,
      priceCents,
      monthlyCredits,
      maxCompetitors,
      maxQuestions,
    })),
  };
}

/** True once the webhook has linked a subscription that is running (trial or paid). */
export function planStarted(agency: ChoosePlanRows["agency"]): boolean {
  return agency.subscriptionId !== null && (agency.status === "trialing" || agency.status === "active");
}
