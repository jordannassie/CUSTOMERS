import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import type { CatalogItem, CatalogKind, CatalogStore } from "./catalog";

type Db = SupabaseClient<Database>;

export type PlanPrice = {
  id: string;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  maxCompetitors: number | null;
  maxQuestions: number | null;
  stripePriceId: string | null;
};
export type TopupPack = { id: string; name: string; credits: number; priceCents: number; stripePriceId: string | null };

/** Active self-serve plans with their Stripe price, for pricing and checkout. Enterprise has no price, so it is left out. */
export async function listPlanPrices(db: Db = createServiceClient()): Promise<PlanPrice[]> {
  const { data, error } = await db
    .from("plans")
    .select("id, name, price_cents, monthly_credits, max_competitors, max_questions, stripe_price_id")
    .eq("active", true)
    .not("price_cents", "is", null)
    .order("price_cents");
  if (error) throw new Error(`listPlanPrices failed: ${error.message}`);
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.price_cents ?? 0,
    monthlyCredits: p.monthly_credits ?? 0,
    maxCompetitors: p.max_competitors,
    maxQuestions: p.max_questions,
    stripePriceId: p.stripe_price_id,
  }));
}

/** One active self-serve plan, or null when it is unknown, inactive or has no price (Enterprise). */
export async function getPlanPrice(planId: string, db: Db = createServiceClient()): Promise<PlanPrice | null> {
  return (await listPlanPrices(db)).find((p) => p.id === planId) ?? null;
}

/** Active top-up packs in display order (D-22). */
export async function listTopupPacks(db: Db = createServiceClient()): Promise<TopupPack[]> {
  const { data, error } = await db
    .from("topup_packs")
    .select("id, name, credits, price_cents, stripe_price_id")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(`listTopupPacks failed: ${error.message}`);
  return data.map((t) => ({
    id: t.id,
    name: t.name,
    credits: t.credits,
    priceCents: t.price_cents,
    stripePriceId: t.stripe_price_id,
  }));
}

/** The plans and packs the Stripe catalog scripts mirror, read and written with the service role. */
export function createCatalogStore(db: Db = createServiceClient()): CatalogStore {
  return {
    async load(): Promise<CatalogItem[]> {
      const [plans, packs] = await Promise.all([
        db.from("plans").select("id, name, price_cents, stripe_product_id, stripe_price_id").eq("active", true)
          .not("price_cents", "is", null).order("price_cents"),
        db.from("topup_packs").select("id, name, price_cents, stripe_product_id, stripe_price_id").eq("active", true)
          .order("sort_order"),
      ]);
      if (plans.error) throw new Error(`load plans failed: ${plans.error.message}`);
      if (packs.error) throw new Error(`load topup_packs failed: ${packs.error.message}`);
      const row = (kind: CatalogKind) => (r: { id: string; name: string; price_cents: number | null;
        stripe_product_id: string | null; stripe_price_id: string | null }): CatalogItem => ({
        kind,
        id: r.id,
        name: r.name,
        priceCents: r.price_cents ?? 0,
        stripeProductId: r.stripe_product_id,
        stripePriceId: r.stripe_price_id,
      });
      return [...plans.data.map(row("plan")), ...packs.data.map(row("topup"))];
    },

    async saveStripeIds(kind, id, { productId, priceId }) {
      const table = kind === "plan" ? "plans" : "topup_packs";
      const { error } = await db
        .from(table)
        .update({ stripe_product_id: productId, stripe_price_id: priceId })
        .eq("id", id);
      if (error) throw new Error(`save Stripe IDs for ${kind}:${id} failed: ${error.message}`);
    },
  };
}
