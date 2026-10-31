import "server-only";
import { env } from "@/lib/env";
import { cardFormMode, type CardFormMode } from "../trial";
import { loadChoosePlanRows } from "./dal";
import { choosePlanState, type ChoosePlanState } from "./service";

export type ChoosePlanPage = { state: ChoosePlanState; mode: CardFormMode; publishableKey: string | null };

/** What the Choose plan page shows; callers pass the agency from requireAgency(). */
export async function loadChoosePlanPage(agencyId: string): Promise<ChoosePlanPage> {
  const state = choosePlanState(await loadChoosePlanRows(agencyId));
  const mode = cardFormMode();
  return { state, mode, publishableKey: mode === "stripe" ? (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null };
}
