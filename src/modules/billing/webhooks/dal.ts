import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { endPreviousPeriodGrants, endTrialGrant, grantCredits, grantTrialCredits, hasTrialGrantAfter, refundTopupGrant } from "@/modules/credits";
import type { Database } from "@/types/database.types";
import { productIdFor } from "../catalog";
import type { PlanCredits } from "./credits";
import { queueSkippedScans } from "@/modules/jobs/server";

// Database reads and writes for the Stripe webhook (B-42), all as the service role.
// Credits change only through the credit SQL functions (via the credits module), never by updating balances here.

type Db = SupabaseClient<Database>;

export type AgencyStatus = "trialing" | "active" | "past_due" | "canceled";
export type ItemStatus = AgencyStatus;
/** `subscriptionId`: the subscription the agency is linked to, so events for another one (a duplicate) are ignored. */
export type WebhookAgency = { id: string; ownerUserId: string; status: string; subscriptionId: string | null };
export type BusinessItem = { businessId: string | null; itemId: string; planId: string; periodEnd: string | null; priceCents?: number | null };
/** claimed: this delivery runs the handler; done: already handled; busy: another delivery is running it now. */
export type EventClaim = "claimed" | "done" | "busy";

// A claim older than this was left by a crash or a timeout, and another delivery may take it over.
export const STALE_CLAIM_MS = 5 * 60_000;

// Set by an admin; Stripe events never overwrite them.
const ADMIN_STATUSES = ["suspended", "deleted"];

export type WebhookStore = ReturnType<typeof createWebhookStore>;

export function createWebhookStore(db: Db = createServiceClient()) {
  return {
    /**
     * Claims the event for this delivery before any handler runs (migration 056): the insert on the unique
     * stripe_event_id is atomic, so of two deliveries at once only one runs it. A finished event is "done"; one that
     * failed earlier, or whose claim went stale, is claimed again with a conditional update.
     */
    async claimEvent(eventId: string, eventType: string, now: Date): Promise<EventClaim> {
      const at = now.toISOString();
      const inserted = await db.from("stripe_webhook_events").insert({ stripe_event_id: eventId, event_type: eventType, claimed_at: at, processed_at: at });
      if (!inserted.error) return "claimed";
      if (inserted.error.code !== "23505") throw new Error(`stripe_webhook_events claim failed: ${inserted.error.message}`);

      const { data, error } = await db.from("stripe_webhook_events").select("error, claimed_at").eq("stripe_event_id", eventId).single();
      if (error) throw new Error(`stripe_webhook_events read failed: ${error.message}`);
      if (data.claimed_at === null && data.error === null) return "done";
      const stale = new Date(now.getTime() - STALE_CLAIM_MS).toISOString();
      if (data.claimed_at !== null && Date.parse(data.claimed_at) > Date.parse(stale)) return "busy";
      // Failed earlier, or a stale claim: take it over, unless another delivery just did.
      const retake = await db
        .from("stripe_webhook_events")
        .update({ claimed_at: at })
        .eq("stripe_event_id", eventId)
        .or(`and(claimed_at.is.null,error.not.is.null),claimed_at.lt.${stale}`)
        .select("id");
      if (retake.error) throw new Error(`stripe_webhook_events claim failed: ${retake.error.message}`);
      return retake.data.length > 0 ? "claimed" : "busy";
    },

    async recordEvent(eventId: string, eventType: string, failure: string | null): Promise<void> {
      const { error } = await db
        .from("stripe_webhook_events")
        .upsert(
          // Finished, handled or failed: the claim is released, so a retry of a failure can claim it again.
          { stripe_event_id: eventId, event_type: eventType, error: failure, processed_at: new Date().toISOString(), claimed_at: null },
          { onConflict: "stripe_event_id" },
        );
      if (error) throw new Error(`stripe_webhook_events write failed: ${error.message}`);
    },

    /** By our agency ID from metadata first, then by the Stripe customer the agency is linked to. */
    async findAgency(ref: { agencyId?: string | null; customerId?: string | null }): Promise<WebhookAgency | null> {
      const query = db.from("agencies").select("id, owner_user_id, status, stripe_subscription_id");
      const { data, error } = ref.agencyId
        ? await query.eq("id", ref.agencyId).maybeSingle()
        : ref.customerId
          ? await query.eq("stripe_customer_id", ref.customerId).maybeSingle()
          : { data: null, error: null };
      if (error) throw new Error(`agency lookup failed: ${error.message}`);
      if (!data && ref.agencyId && ref.customerId) return this.findAgency({ customerId: ref.customerId });
      return data ? { id: data.id, ownerUserId: data.owner_user_id, status: data.status, subscriptionId: data.stripe_subscription_id } : null;
    },

    async linkStripe(agencyId: string, ids: { customerId: string | null; subscriptionId: string | null }): Promise<void> {
      const update: Database["public"]["Tables"]["agencies"]["Update"] = {};
      if (ids.customerId) update.stripe_customer_id = ids.customerId;
      if (ids.subscriptionId) update.stripe_subscription_id = ids.subscriptionId;
      if (Object.keys(update).length === 0) return;
      const { error } = await db.from("agencies").update(update).eq("id", agencyId);
      if (error) throw new Error(`link Stripe IDs failed: ${error.message}`);
    },

    async updateAgency(
      agencyId: string,
      fields: { status?: AgencyStatus; trialEndsAt?: string | null; currentPeriodEnd?: string | null; cancelAt?: string | null },
    ): Promise<void> {
      const update: Database["public"]["Tables"]["agencies"]["Update"] = {};
      if (fields.trialEndsAt !== undefined) update.trial_ends_at = fields.trialEndsAt;
      if (fields.currentPeriodEnd !== undefined) update.current_period_end = fields.currentPeriodEnd;
      if (fields.cancelAt !== undefined) update.cancel_at = fields.cancelAt;
      if (Object.keys(update).length > 0) {
        const { error } = await db.from("agencies").update(update).eq("id", agencyId);
        if (error) throw new Error(`update agency failed: ${error.message}`);
      }
      if (fields.status) {
        const { error } = await db
          .from("agencies")
          .update({ status: fields.status })
          .eq("id", agencyId)
          .not("status", "in", `(${ADMIN_STATUSES.join(",")})`);
        if (error) throw new Error(`update agency status failed: ${error.message}`);
      }
    },

    /**
     * Plans keyed by Stripe product ID, so renewals on an older price of the same plan still match. The catalog's
     * fixed product ID (cd_plan_starter) is matched too, before the sync has stored it.
     */
    async plansByProduct(): Promise<Map<string, PlanCredits>> {
      const { data, error } = await db.from("plans").select("id, monthly_credits, stripe_product_id").not("monthly_credits", "is", null);
      if (error) throw new Error(`plans read failed: ${error.message}`);
      const plans = new Map<string, PlanCredits>();
      for (const p of data) {
        const plan = { planId: p.id, monthlyCredits: p.monthly_credits ?? 0 };
        plans.set(productIdFor({ kind: "plan", id: p.id }), plan);
        if (p.stripe_product_id) plans.set(p.stripe_product_id, plan);
      }
      return plans;
    },

    async topupCredits(packId: string): Promise<number | null> {
      const { data, error } = await db.from("topup_packs").select("credits").eq("id", packId).maybeSingle();
      if (error) throw new Error(`topup_packs read failed: ${error.message}`);
      return data?.credits ?? null;
    },

    grant: grantCredits,
    grantTrial: grantTrialCredits,
    /** After a top-up: the scans skipped for lack of credits run now, not at the next 02:00 (M3, migration 069). */
    queueSkippedScans,
    endTrialGrant,
    hasTrialGrantAfter,
    endPreviousPeriodGrants,
    refundTopupGrant,

    /**
     * Makes business_subscriptions match the subscription's items. Items name their business in metadata;
     * an item without one updates the row already linked to it. Rows whose item is gone are canceled and
     * their business stops being scheduled. Returns the businesses that were canceled.
     */
    async syncBusinessItems(agencyId: string, items: BusinessItem[], status: ItemStatus): Promise<string[]> {
      const { data: owned, error: ownedError } = await db.from("businesses").select("id").eq("agency_id", agencyId);
      if (ownedError) throw new Error(`businesses read failed: ${ownedError.message}`);
      const ownedIds = new Set(owned.map((b) => b.id));

      for (const item of items) {
        const row = {
          plan_id: item.planId,
          status,
          current_period_end: item.periodEnd,
          stripe_subscription_item_id: item.itemId,
          // Left as it is when the price is not known (an item Stripe sent without one).
          ...(item.priceCents == null ? {} : { price_cents: item.priceCents }),
        };
        if (item.businessId && ownedIds.has(item.businessId)) {
          const { error } = await db
            .from("business_subscriptions")
            .upsert({ business_id: item.businessId, agency_id: agencyId, ...row }, { onConflict: "business_id" });
          if (error) throw new Error(`business_subscriptions upsert failed: ${error.message}`);
        } else {
          if (item.businessId) console.warn("[stripe/webhook] item names a business of another agency", item.itemId);
          const { error } = await db
            .from("business_subscriptions")
            .update(row)
            .eq("agency_id", agencyId)
            .eq("stripe_subscription_item_id", item.itemId);
          if (error) throw new Error(`business_subscriptions update failed: ${error.message}`);
        }
      }

      const keep = items.map((i) => i.itemId);
      let gone = db.from("business_subscriptions").select("business_id").eq("agency_id", agencyId).neq("status", "canceled");
      if (keep.length > 0) gone = gone.or(`stripe_subscription_item_id.is.null,stripe_subscription_item_id.not.in.(${keep.join(",")})`);
      const { data: removed, error } = await gone;
      if (error) throw new Error(`business_subscriptions read failed: ${error.message}`);
      const removedIds = removed.map((r) => r.business_id);
      await this.cancelBusinesses(agencyId, removedIds);
      return removedIds;
    },

    async setBusinessStatus(agencyId: string, status: ItemStatus): Promise<void> {
      const { error } = await db
        .from("business_subscriptions")
        .update({ status })
        .eq("agency_id", agencyId)
        .neq("status", "canceled");
      if (error) throw new Error(`business_subscriptions status failed: ${error.message}`);
    },

    /** Cancels the businesses' subscriptions and takes them off the scan schedule. */
    async cancelBusinesses(agencyId: string, businessIds: string[]): Promise<void> {
      if (businessIds.length === 0) return;
      const subs = await db
        .from("business_subscriptions")
        .update({ status: "canceled" })
        .eq("agency_id", agencyId)
        .in("business_id", businessIds);
      if (subs.error) throw new Error(`cancel business_subscriptions failed: ${subs.error.message}`);
      const scans = await db.from("businesses").update({ next_scan_at: null }).eq("agency_id", agencyId).in("id", businessIds);
      if (scans.error) throw new Error(`stop business scans failed: ${scans.error.message}`);
    },

    async ownerEmail(ownerUserId: string): Promise<string | null> {
      const { data, error } = await db.auth.admin.getUserById(ownerUserId);
      if (error) throw new Error(`owner lookup failed: ${error.message}`);
      return data.user?.email ?? null;
    },
  };
}
