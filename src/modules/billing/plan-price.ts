import { CATALOG_CURRENCY, productIdFor } from "./catalog";

// BUG-103 (D-56): Stripe refuses two items with the same price on one subscription ("an existing Subscription Item
// is already using that Price"), so two businesses on Starter can't both use the catalog price. Each business's
// item gets its own price for the plan's product instead (`price_data`), and a plan is always told apart by its
// product, never by its price ID. Pure, no env or DB imports.

export type PlanPriceData = {
  currency: typeof CATALOG_CURRENCY;
  product: string;
  unit_amount: number;
  recurring: { interval: "month" };
};

/** A new monthly price for one business's item on this plan. The amount comes from the plans row. */
export function planPriceData(plan: { id: string; priceCents: number }): PlanPriceData {
  return {
    currency: CATALOG_CURRENCY,
    product: productIdFor({ kind: "plan", id: plan.id }),
    unit_amount: plan.priceCents,
    recurring: { interval: "month" },
  };
}

type PriceRef = string | { id: string; product?: string | { id: string } | null } | null | undefined;

/** The product of an item's price, when Stripe sent the price as an object. */
export function productOfPrice(price: PriceRef): string | null {
  if (!price || typeof price === "string" || !price.product) return null;
  return typeof price.product === "string" ? price.product : price.product.id;
}

/** The plan an item's price belongs to, by product. */
export function planIdOfPrice(price: PriceRef, plans: { id: string }[]): string | null {
  const product = productOfPrice(price);
  return plans.find((p) => productIdFor({ kind: "plan", id: p.id }) === product)?.id ?? null;
}

const priceIdOf = (price: PriceRef) => (!price ? "" : typeof price === "string" ? price : price.id);

/**
 * True when two item prices are the same plan. Adding a business while a change is scheduled wrote it into both
 * schedule phases with `price_data`, and Stripe made a separate price for each phase, so "Starter" showed as moving
 * to Starter (2026-10-15). The product decides; the price ID only when a product is unknown.
 */
export function samePlanPrice(a: PriceRef, b: PriceRef): boolean {
  const productA = productOfPrice(a);
  const productB = productOfPrice(b);
  if (productA && productB) return productA === productB;
  return priceIdOf(a) === priceIdOf(b);
}
