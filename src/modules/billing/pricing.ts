import "server-only";
import { cacheLife } from "next/cache";
import { listPlanPrices, listTopupPacks } from "./dal";
import type { PublicPricing } from "./format";

async function orEmpty<T>(read: Promise<T[]>): Promise<T[]> {
  try {
    return await read;
  } catch (error) {
    console.error("[pricing]", error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Plan and top-up prices for the public pages, the same for every visitor (MVP_SPEC 12.3).
 * Prices are still pending Jordan (D-21, D-22), so they change only in the database; the short cache
 * means a row update shows on the site within a few minutes without a deploy.
 */
export async function getPublicPricing(): Promise<PublicPricing> {
  "use cache";
  cacheLife("minutes");
  // A failed read shows the "prices are being updated" state instead of breaking every marketing page;
  // the short cache retries it within minutes.
  const [plans, packs] = await Promise.all([orEmpty(listPlanPrices()), orEmpty(listTopupPacks())]);
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
