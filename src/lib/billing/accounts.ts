/**
 * Billing account queries for Customers.Direct.
 *
 * Functions for loading billing_accounts and business_billing_items.
 * All functions use the service role unless otherwise noted.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlanConfig, type CanonicalPlanId } from "@/config/pricing";

export interface BillingAccount {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_interval: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessBillingItem {
  id: string;
  billing_account_id: string;
  business_id: string;
  plan_id: string;
  stripe_subscription_item_id: string | null;
  status: string;
  price_monthly_cents: number | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountSummary {
  billingAccount: BillingAccount | null;
  businessItems: BusinessBillingItem[];
  totalMrrCents: number;
  activeBusinessCount: number;
}

/** Get or create a billing account for the given user. */
export async function getOrCreateBillingAccount(userId: string): Promise<BillingAccount> {
  const svc = createServiceClient();

  const { data: existing } = await svc
    .from("billing_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing as BillingAccount;

  const { data: created, error } = await svc
    .from("billing_accounts")
    .insert({ user_id: userId, status: "none" })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create billing account: ${error?.message}`);
  }

  return created as BillingAccount;
}

/** Get billing account by Stripe customer ID. */
export async function getBillingAccountByStripeCustomer(
  stripeCustomerId: string
): Promise<BillingAccount | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("billing_accounts")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  return (data as BillingAccount | null) ?? null;
}

/** Get full account summary including all business billing items. */
export async function getAccountSummary(userId: string): Promise<AccountSummary> {
  const svc = createServiceClient();

  const { data: ba } = await svc
    .from("billing_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ba) {
    return { billingAccount: null, businessItems: [], totalMrrCents: 0, activeBusinessCount: 0 };
  }

  const { data: items } = await svc
    .from("business_billing_items")
    .select("*")
    .eq("billing_account_id", ba.id);

  const businessItems = (items ?? []) as BusinessBillingItem[];
  const activeItems = businessItems.filter((i) => i.status === "active" || i.status === "trialing");
  const totalMrrCents = activeItems.reduce((sum, item) => {
    return sum + (item.price_monthly_cents ?? getPlanConfig(item.plan_id).priceMonthly);
  }, 0);

  return {
    billingAccount: ba as BillingAccount,
    businessItems,
    totalMrrCents,
    activeBusinessCount: activeItems.length,
  };
}

/** Get business billing item by Stripe subscription item ID. */
export async function getBusinessItemByStripeItemId(
  stripeItemId: string
): Promise<BusinessBillingItem | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("business_billing_items")
    .select("*")
    .eq("stripe_subscription_item_id", stripeItemId)
    .maybeSingle();
  return (data as BusinessBillingItem | null) ?? null;
}

/** Get all business billing items for an account. */
export async function getBusinessItemsForAccount(
  billingAccountId: string
): Promise<BusinessBillingItem[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("business_billing_items")
    .select("*")
    .eq("billing_account_id", billingAccountId);
  return (data ?? []) as BusinessBillingItem[];
}

/** Update billing account from Stripe subscription data. */
export async function syncBillingAccount(
  userId: string,
  updates: Partial<{
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    billing_interval: string;
  }>
): Promise<void> {
  const svc = createServiceClient();
  await svc
    .from("billing_accounts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/** Update a business billing item. */
export async function syncBusinessBillingItem(
  businessId: string,
  updates: Partial<{
    plan_id: string;
    stripe_subscription_item_id: string | null;
    status: string;
    price_monthly_cents: number | null;
    current_period_end: string | null;
  }>
): Promise<void> {
  const svc = createServiceClient();
  await svc
    .from("business_billing_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
}

/**
 * Admin: Get all billing accounts with business counts and MRR.
 * Returns raw data; admin page formats it.
 */
export async function adminGetAllAccounts(opts?: { limit?: number; offset?: number }) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("billing_accounts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 100) - 1);
  return (data ?? []) as BillingAccount[];
}

/** Admin: Get total MRR from active business billing items. */
export async function adminGetTotalMrr(): Promise<number> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("business_billing_items")
    .select("plan_id, price_monthly_cents")
    .in("status", ["active", "trialing"]);

  return (data ?? []).reduce((sum, item) => {
    return sum + (item.price_monthly_cents ?? getPlanConfig(item.plan_id).priceMonthly);
  }, 0);
}
