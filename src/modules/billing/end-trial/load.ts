import "server-only";
import { viewerTimeZone } from "@/lib/viewer-time-zone";
import { billingAccess } from "../account/access";
import { loadPlanChangeData } from "../plan-change/dal";
import { PlanChangeError } from "../plan-change/planner";
import { planNowOffer, type PlanNowOffer } from "./service";

export type PlanNowView = ({ kind: "offer" } & PlanNowOffer) | { kind: "unavailable"; message: string };

/**
 * The "Start my plan now" box on the new-business plan page. Callers pass the agency from requireAgency() and
 * call this only when the trial limit is what blocks a new business.
 */
export async function loadPlanNowOffer(agencyId: string): Promise<PlanNowView> {
  const data = await loadPlanChangeData(agencyId);
  const access = await billingAccess(data);
  if (!access) {
    return { kind: "unavailable", message: "Starting your plan early isn't available right now. Contact us and we'll start it for you." };
  }
  try {
    const deps = { stripe: access.stripe, plansByProduct: data.plansByProduct, now: () => new Date(), timeZone: await viewerTimeZone() };
    return { kind: "offer", ...(await planNowOffer(access.context, deps)) };
  } catch (error) {
    if (error instanceof PlanChangeError) return { kind: "unavailable", message: error.message };
    console.error("[billing/end-trial] could not load the offer", error instanceof Error ? error.message : String(error));
    return { kind: "unavailable", message: "We couldn't load your plan just now. Refresh the page in a minute." };
  }
}
