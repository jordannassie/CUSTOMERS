import "server-only";
import { env } from "@/lib/env";
import { cardFormMode, type CardFormMode } from "../trial";
import { loadChoosePlanRows, savedPlanInStripe } from "./dal";
import { choosePlanState, endedRows, type ChoosePlanRows, type ChoosePlanState } from "./service";

export type ChoosePlanPage = { state: ChoosePlanState; mode: CardFormMode; publishableKey: string | null };

/** What the Choose plan page shows; callers pass the agency from requireAgency(). */
export async function loadChoosePlanPage(agencyId: string): Promise<ChoosePlanPage> {
  const rows = await loadChoosePlanRows(agencyId);
  const state = choosePlanState((await planGoneFromStripe(rows)) ? endedRows(rows) : rows);
  const mode = cardFormMode();
  return { state, mode, publishableKey: mode === "stripe" ? (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null };
}

/**
 * True when the saved plan is no longer in Stripe (QA 2026-11-01: such an agency had no way to pay). Read only: the
 * plan is ended in our records when the user starts a new one (startPlanCheckout). A Stripe outage keeps the old rule.
 */
export async function planGoneFromStripe(rows: ChoosePlanRows): Promise<boolean> {
  const id = rows.agency.subscriptionId;
  if (!id || choosePlanState(rows).kind !== "has_plan") return false;
  try {
    return (await savedPlanInStripe(id)) === "missing";
  } catch (error) {
    console.error("[billing/choose-plan] could not check the saved plan:", error instanceof Error ? error.message : error);
    return false;
  }
}
