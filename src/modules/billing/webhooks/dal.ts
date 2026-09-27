import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";
import type { Database } from "@/types/database.types";
import { productIdFor } from "../catalog";
import type { PlanCredits } from "./credits";

// Database reads and writes for the Stripe webhook (B-42), all as the service role.
// Credits change only through grant_credits (via the credits module), never by updating balances here.

type Db = SupabaseClient<Database>;

export type AgencyStatus = "trialing" | "active" | "past_due" | "canceled";
export type ItemStatus = AgencyStatus;
export type WebhookAgency = { id: string; ownerUserId: string; status: string };
export type BusinessItem = { businessId: string | null; itemId: string; planId: string; periodEnd: string | null };
export type EventState = "new" | "failed" | "done";

// Set by an admin; Stripe events never overwrite them.
const ADMIN_STATUSES = ["suspended", "deleted"];

export type WebhookStore = ReturnType<typeof createWebhookStore>;

export function createWebhookStore(db: Db = createServiceClient()) {
  return {
    /** "done" blocks a replay; "failed" (an earlier attempt threw) is processed again. */
    async eventState(eventId: string): Promise<EventState> {
      const { data, error } = await db
        .from("stripe_webhook_events")
        .select("error")
        .eq("stripe_event_id", eventId)
        .maybeSingle();
      if (error) throw new Error(`stripe_webhook_events read failed: ${error.message}`);
      if (!data) return "new";
      return data.error === null ? "done" : "failed";
    },

    async recordEvent(eventId: string, eventType: string, failure: string | null): Promise<void> {
      const { error } = await db
        .from("stripe_webhook_events")
        .upsert(
          { stripe_event_id: eventId, event_type: eventType, error: failure, processed_at: new Date().toISOString() },
          { onConflict: "stripe_event_id" },
        );
      if (error) throw new Error(`stripe_webhook_events write failed: ${error.message}`);
    },

    /** By our agency ID from metadata first, then by the Stripe customer the agency is linked to. */
    async findAgency(ref: { agencyId?: string | null; customerId?: string | null }): Promise<WebhookAgency | null> {
      const query = db.from("agencies").select("id, owner_user_id, status");
      const { data, error } = ref.agencyId
        ? await query.eq("id", ref.agencyId).maybeSingle()
        : ref.customerId
          ? await query.eq("stripe_customer_id", ref.customerId).maybeSingle()
          : { data: null, error: null };
      if (error) throw new Error(`agency lookup failed: ${error.message}`);
      if (!data && ref.agencyId && ref.customerId) return this.findAgency({ customerId: ref.customerId });
      return data ? { id: data.id, ownerUserId: data.owner_user_id, status: data.status } : null;
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
      fields: { status?: AgencyStatus; trialEndsAt?: string | null; currentPeriodEnd?: string | null },
    ): Promise<void> {
      const update: Database["public"]["Tables"]["agencies"]["Update"] = {};
      if (fields.trialEndsAt !== undefined) update.trial_ends_at = fields.trialEndsAt;
      if (fields.currentPeriodEnd !== undefined) update.current_period_end = fields.currentPeriodEnd;
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
        const row = { plan_id: item.planId, status, current_period_end: item.periodEnd, stripe_subscription_item_id: item.itemId };
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
