import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { AGENCY_ACTIVE_STATUSES } from "./pricing";

export type LaunchKitAccess = {
  launchKitPurchased: boolean;
  purchaseEmail: string | null;
  purchasedAt: string | null;
};

export type AgencyProgramAccess = {
  status: string | null;
  active: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
};

export async function getLaunchKitAccess(input: {
  userId?: string | null;
  email?: string | null;
}): Promise<LaunchKitAccess> {
  const svc = createServiceClient();
  const email = input.email?.trim().toLowerCase() ?? "";

  if (input.userId) {
    const { data } = await svc
      .from("launch_kit_purchases")
      .select("email, purchased_at, status")
      .eq("user_id", input.userId)
      .eq("status", "paid")
      .order("purchased_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        launchKitPurchased: true,
        purchaseEmail: data.email,
        purchasedAt: data.purchased_at,
      };
    }
  }

  if (email) {
    const { data } = await svc
      .from("launch_kit_purchases")
      .select("email, purchased_at, status, user_id")
      .eq("status", "paid")
      .ilike("email", email)
      .order("purchased_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        launchKitPurchased: true,
        purchaseEmail: data.email,
        purchasedAt: data.purchased_at,
      };
    }
  }

  return { launchKitPurchased: false, purchaseEmail: null, purchasedAt: null };
}

export async function claimPurchasesForUser(userId: string, email: string): Promise<void> {
  const svc = createServiceClient();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  await svc
    .from("launch_kit_purchases")
    .update({ user_id: userId })
    .is("user_id", null)
    .ilike("email", normalized);
}

export async function recordLaunchKitPurchase(row: {
  userId: string | null;
  email: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  amountCents: number;
}): Promise<void> {
  const svc = createServiceClient();
  await svc.from("launch_kit_purchases").upsert(
    {
      user_id: row.userId,
      email: row.email.trim().toLowerCase(),
      stripe_checkout_session_id: row.stripeCheckoutSessionId,
      stripe_payment_intent_id: row.stripePaymentIntentId,
      stripe_customer_id: row.stripeCustomerId,
      amount_cents: row.amountCents,
      status: "paid",
    },
    { onConflict: "stripe_checkout_session_id" },
  );
}

export async function getAgencyProgramAccess(userId: string): Promise<AgencyProgramAccess> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("agency_program_subscriptions")
    .select("status, current_period_end, cancel_at_period_end, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const status = data?.status ?? null;
  return {
    status,
    active: !!status && AGENCY_ACTIVE_STATUSES.has(status),
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    stripeSubscriptionId: data?.stripe_subscription_id ?? null,
  };
}

export async function upsertAgencyProgramSubscription(row: {
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  const svc = createServiceClient();
  await svc.from("agency_program_subscriptions").upsert(
    {
      user_id: row.userId,
      email: row.email,
      stripe_customer_id: row.stripeCustomerId,
      stripe_subscription_id: row.stripeSubscriptionId,
      status: row.status,
      current_period_end: row.currentPeriodEnd,
      cancel_at_period_end: row.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function getCompletedLessonIds(userId: string): Promise<string[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("academy_lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId);
  return (data ?? []).map((row) => row.lesson_id);
}

export async function markLessonComplete(userId: string, lessonId: string): Promise<void> {
  const svc = createServiceClient();
  await svc.from("academy_lesson_progress").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );
}
