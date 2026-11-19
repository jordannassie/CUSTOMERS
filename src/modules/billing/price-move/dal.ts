import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { MoveBusiness, MovePlan, PriceMovePlan } from "./service";

// Reads and writes for moving existing customers to new plan prices (D-93), as the service role. No user is signed in:
// the hourly job (run_email_job('price_changes')) calls these.

export type MoveAgency = { id: string; subscriptionId: string; ownerUserId: string };

/**
 * Agencies a price move may reach: a live paid or trial subscription that renews, with at least one business whose
 * stored price is unknown or differs from its plan's price now. Test agencies have no Stripe subscription.
 */
export async function priceMoveCandidates(): Promise<MoveAgency[]> {
  const db = createServiceClient();
  const { data: items, error } = await db
    .from("business_subscriptions")
    .select("agency_id, price_cents, plans!inner(price_cents)")
    .neq("status", "canceled");
  if (error) throw new Error(`Price moves: could not read business plans: ${error.message}`);
  const off = new Set(items.filter((i) => i.price_cents === null || i.price_cents !== i.plans.price_cents).map((i) => i.agency_id));
  if (off.size === 0) return [];
  const { data: agencies, error: agencyError } = await db
    .from("agencies")
    .select("id, stripe_subscription_id, owner_user_id")
    .in("id", [...off])
    .in("status", ["active", "trialing", "past_due"])
    .eq("is_test", false)
    .is("deleted_at", null)
    .is("cancel_at", null)
    .not("stripe_subscription_id", "is", null);
  if (agencyError) throw new Error(`Price moves: could not read agencies: ${agencyError.message}`);
  return agencies.map((a) => ({ id: a.id, subscriptionId: a.stripe_subscription_id!, ownerUserId: a.owner_user_id }));
}

/** The plans' prices now and the agency's businesses on the plan. */
export async function loadMoveContext(agencyId: string): Promise<{ plans: MovePlan[]; businesses: MoveBusiness[] }> {
  const db = createServiceClient();
  const [plans, items] = await Promise.all([
    db.from("plans").select("id, price_cents").not("price_cents", "is", null),
    db.from("business_subscriptions").select("business_id, stripe_subscription_item_id, businesses!inner(deleted_at)").eq("agency_id", agencyId).neq("status", "canceled"),
  ]);
  if (plans.error) throw new Error(`Price moves: could not read plans: ${plans.error.message}`);
  if (items.error) throw new Error(`Price moves: could not read business plans: ${items.error.message}`);
  return {
    plans: plans.data.map((p) => ({ id: p.id, priceCents: p.price_cents! })),
    businesses: items.data.map((i) => ({ id: i.business_id, itemId: i.stripe_subscription_item_id, deleted: i.businesses.deleted_at !== null })),
  };
}

/** What Stripe charges for each item now (the webhook writes the same a moment later). */
export async function saveItemPrices(agencyId: string, prices: PriceMovePlan["prices"]): Promise<void> {
  const db = createServiceClient();
  for (const { itemId, cents } of prices) {
    const { error } = await db.from("business_subscriptions").update({ price_cents: cents }).eq("agency_id", agencyId).eq("stripe_subscription_item_id", itemId);
    if (error) throw new Error(`Price moves: could not save an item price: ${error.message}`);
  }
}

/**
 * Records the businesses whose renewal price changes, under one batch for the email. Written before the Stripe change,
 * so a failed save never leaves a moved customer without their email; taken back with forgetMoves if Stripe refuses.
 */
export async function recordMoves(agencyId: string, plan: PriceMovePlan, batch: string): Promise<void> {
  if (plan.moves.length === 0) return;
  const startsAt = new Date(plan.startsAt * 1000).toISOString();
  const rows = plan.moves.map((m) => ({ agency_id: agencyId, business_id: m.businessId, plan_id: m.planId, from_cents: m.fromCents, to_cents: m.toCents, starts_at: startsAt, batch }));
  const { error } = await createServiceClient().from("price_changes").insert(rows);
  if (error) throw new Error(`Price moves: could not record the price change: ${error.message}`);
}

export async function forgetMoves(batch: string): Promise<void> {
  const { error } = await createServiceClient().from("price_changes").delete().eq("batch", batch);
  if (error) throw new Error(`Price moves: could not take back a price change: ${error.message}`);
}

export type PriceNotice = {
  batch: string;
  agencyId: string;
  startsAt: string;
  trialing: boolean;
  lines: { business: string; plan: string; fromCents: number; toCents: number }[];
};

/** Price changes recorded in the last 30 days, one notice per batch; the email log tells which were sent. */
export async function recentPriceNotices(now: Date): Promise<PriceNotice[]> {
  const db = createServiceClient();
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("price_changes")
    .select("batch, agency_id, starts_at, from_cents, to_cents, businesses!inner(name), plans!inner(name), agencies!inner(status)")
    .gte("created_at", since)
    .order("created_at");
  if (error) throw new Error(`Price moves: could not read price changes: ${error.message}`);
  const notices = new Map<string, PriceNotice>();
  for (const row of data) {
    const notice = notices.get(row.batch) ?? {
      batch: row.batch,
      agencyId: row.agency_id,
      startsAt: row.starts_at,
      trialing: row.agencies.status === "trialing",
      lines: [],
    };
    notice.lines.push({ business: row.businesses.name, plan: row.plans.name, fromCents: row.from_cents, toCents: row.to_cents });
    notices.set(row.batch, notice);
  }
  return [...notices.values()];
}

export async function agencyOwnerEmail(agencyId: string): Promise<string | null> {
  const db = createServiceClient();
  const { data, error } = await db.from("agencies").select("owner_user_id").eq("id", agencyId).maybeSingle();
  if (error) throw new Error(`Price moves: could not read the agency: ${error.message}`);
  if (!data?.owner_user_id) return null;
  const owner = await db.auth.admin.getUserById(data.owner_user_id);
  if (owner.error) throw new Error(`Price moves: owner lookup failed: ${owner.error.message}`);
  return owner.data.user?.email ?? null;
}
