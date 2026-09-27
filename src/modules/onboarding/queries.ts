import "server-only";
import { requireUser, type GuardOptions } from "@/modules/auth";
import { loadCompetitorStep, type CompetitorStep } from "./dal";

/** For the competitor step page (and the B-36 wizard). Null when the business is not the user's. */
export async function getCompetitorStep(businessId: string, options: GuardOptions = {}): Promise<CompetitorStep | null> {
  const user = await requireUser(options);
  return loadCompetitorStep(user.id, businessId);
}
