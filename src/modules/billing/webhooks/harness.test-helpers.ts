import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";
import type { SendEmailInput } from "@/modules/email";
import { processStripeWebhook } from "../webhooks";
import { createWebhookStore } from "./dal";
import type { WebhookDeps } from "./handlers";
import * as fx from "./fixtures.test-helpers";

// Local database set-up and read-backs for the webhook fixture tests (B-42).
export const service = createServiceClient();
export const secret = fx.webhookSecret();
const userIds: string[] = [];

export async function cleanUp() {
  for (const userId of userIds.splice(0)) await service.auth.admin.deleteUser(userId);
}

export async function setup(status = "trialing") {
  const email = `vitest-webhook-${randomUUID()}@example.test`;
  const { data: user, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Webhook test", is_test: true, status })
    .select("id")
    .single()
    .throwOnError();
  const businesses = [];
  for (const name of ["Bean There Coffee", "Joe's Plumbing"]) {
    const { data } = await service
      .from("businesses")
      .insert({ owner_user_id: user.user.id, agency_id: agency.id, name, status: "active", next_scan_at: new Date().toISOString() })
      .select("id")
      .single()
      .throwOnError();
    businesses.push(data.id);
  }
  return { agencyId: agency.id, email, businesses, customer: fx.id("cus") };
}

export function harness() {
  const emails: SendEmailInput[] = [];
  const subscriptions = new Map<string, Stripe.Subscription>();
  const deps: WebhookDeps = {
    store: createWebhookStore(service),
    stripe: {
      retrieveSubscription: async (subId) => {
        const sub = subscriptions.get(subId);
        if (!sub) throw new Error(`no fixture for ${subId}`);
        return sub;
      },
      listSubscriptionItems: async () => [],
      listInvoiceLines: async () => [],
    },
    sendEmail: async (input) => {
      emails.push(input);
      return { status: "sent", providerId: "fake" };
    },
    now: () => new Date(),
  };
  const deliver = async (event: Stripe.Event) => {
    const { payload, signature } = fx.signedPayload(event, secret);
    return processStripeWebhook(payload, signature, { secret, deps });
  };
  /** Delivers the same event twice, as a Stripe retry would. */
  const deliverTwice = async (event: Stripe.Event) => [await deliver(event), await deliver(event)];
  return { emails, subscriptions, deliver, deliverTwice };
}

export async function grants(agencyId: string) {
  const { data } = await service
    .from("credit_grants")
    .select("source, source_id, amount, remaining, expires_at")
    .eq("agency_id", agencyId)
    .order("created_at")
    .throwOnError();
  return data;
}

export const grantCreditsForTest = (agencyId: string) =>
  grantCredits({ agencyId, source: "promo", sourceId: `promo-${randomUUID()}`, amount: 50, expiresAt: null });

export async function ledgerTotal(agencyId: string) {
  const { data } = await service.from("credit_transactions").select("delta").eq("agency_id", agencyId).throwOnError();
  return data.reduce((sum, row) => sum + row.delta, 0);
}

export async function agencyRow(agencyId: string) {
  const { data } = await service
    .from("agencies")
    .select("status, stripe_customer_id, stripe_subscription_id, trial_ends_at, current_period_end")
    .eq("id", agencyId)
    .single()
    .throwOnError();
  return data;
}

export async function businessRows(agencyId: string) {
  const { data } = await service
    .from("business_subscriptions")
    .select("business_id, plan_id, status, stripe_subscription_item_id")
    .eq("agency_id", agencyId)
    .order("plan_id")
    .throwOnError();
  return data;
}
