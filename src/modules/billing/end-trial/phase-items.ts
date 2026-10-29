import type Stripe from "stripe";
import type { ItemSpec } from "../plan-change/planner";

// The subscription items that make the subscription match a schedule phase, for one subscription update (BUG-282).
// Items match on business_id: an item whose business is not in the phase is deleted, an item whose price or
// quantity differs is changed in place (so it keeps its ID and the business keeps its link), and a business only
// in the phase gets a new item. Items that already match are left out.

/** A subscription item's ID with its spec, business_id filled in from the database link (planner currentItems). */
export type LiveItem = { id: string; spec: ItemSpec };

const bidOf = (spec: ItemSpec) => spec.metadata.business_id;

export function itemsToMatchPhase(live: LiveItem[], phase: ItemSpec[]): Stripe.SubscriptionUpdateParams.Item[] {
  const byBusiness = new Map(live.filter((i) => bidOf(i.spec)).map((i) => [bidOf(i.spec), i]));
  const used = new Set<string>();
  const items: Stripe.SubscriptionUpdateParams.Item[] = [];
  for (const spec of phase) {
    const match = bidOf(spec) ? byBusiness.get(bidOf(spec)) : undefined;
    if (!match || used.has(match.id)) {
      items.push({ ...spec });
      continue;
    }
    used.add(match.id);
    const same = !spec.price_data && spec.price === match.spec.price && spec.quantity === match.spec.quantity;
    if (same) continue;
    const price = spec.price_data ? { price_data: spec.price_data } : { price: spec.price };
    items.push({ id: match.id, ...price, quantity: spec.quantity, metadata: spec.metadata });
  }
  for (const item of live) if (!used.has(item.id)) items.push({ id: item.id, deleted: true });
  return items;
}
