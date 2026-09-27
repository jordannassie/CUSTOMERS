import "server-only";
import { cacheLife } from "next/cache";
import { listPlanPrices, listTopupPacks } from "./dal";
import type { PublicPricing } from "./format";

/**
 * Plan and top-up prices for the public pages, the same for every visitor (MVP_SPEC 12.3).
 * Prices are still pending Jordan (D-21, D-22), so they change only in the database; the short cache
 * means a row update shows on the site within a few minutes without a deploy.
 */
export async function getPublicPricing(): Promise<PublicPricing> {
  "use cache";
  cacheLife("minutes");
  const [plans, packs] = await Promise.all([listPlanPrices(), listTopupPacks()]);
  return {
    plans: plans.map(({ id, name, priceCents, monthlyCredits, maxCompetitors, maxQuestions }) => ({
      id,
      name,
      priceCents,
      monthlyCredits,
      maxCompetitors,
      maxQuestions,
    })),
    packs: packs.map(({ id, credits, priceCents }) => ({ id, credits, priceCents })),
  };
}
