import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createTrialCheckout, getTrialOffer, trialAllowed, type StartTrialResult, type TrialOffer } from "@/modules/billing";
import { ownStep } from "../dal";
import { finishWizard, selectedPlan } from "../questions/dal";
import { needsCard, stepNumber } from "../steps";

// Step 8, the card (B-41, MVP_SPEC 3.1). The wizard only finishes once the Stripe webhook has linked the
// subscription to the agency; the card form's own success never marks anything paid.

async function loadAgency(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("id, is_test, stripe_customer_id, stripe_subscription_id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load agency: ${error.message}`);
  return (
    data && {
      id: data.id,
      isTest: data.is_test,
      hasSubscription: data.stripe_subscription_id !== null,
      trialAllowed: trialAllowed({ stripeCustomerId: data.stripe_customer_id, stripeSubscriptionId: data.stripe_subscription_id }),
    }
  );
}

// The plan picked on the pricing page, else Starter, as the models step and entitlements assume.
const chosenPlan = async (userId: string) => (await selectedPlan(userId)) ?? "starter";

/** What the card step shows, or null when the business is not the user's draft at step 8. */
export async function loadCardStep(userId: string, businessId: string): Promise<{ offer: TrialOffer | null } | null> {
  const step = await ownStep(userId, businessId);
  if (step === undefined || (step ?? 0) < stepNumber("card")) return null;
  return { offer: await getTrialOffer(await chosenPlan(userId)) };
}

export async function startCardCheckout(
  user: { id: string; email: string | null },
  businessId: string,
  returnUrl: string,
): Promise<StartTrialResult | { ok: false; status: 404 | 409; error: string }> {
  const step = await ownStep(user.id, businessId);
  if (step === undefined) return { ok: false, status: 404, error: "Business not found." };
  const agency = await loadAgency(user.id);
  if (!agency) return { ok: false, status: 409, error: "Add your agency name first." };
  // A second session would start a second subscription for the same agency.
  if (!needsCard(agency, false)) return { ok: false, status: 409, error: "Your free trial has already started." };
  if (!agency.trialAllowed) return { ok: false, status: 409, error: "You've already had your free trial. Contact us to start your plan." };
  return createTrialCheckout({ agencyId: agency.id, businessId, email: user.email, returnUrl, planId: await chosenPlan(user.id) });
}

/**
 * True once the webhook has linked a subscription (or the agency needs no card), and then the business
 * is set up. False while the user waits on "Setting up your account". Null when it is not theirs.
 */
export async function finishCardStep(userId: string, businessId: string): Promise<boolean | null> {
  const step = await ownStep(userId, businessId);
  if (step === undefined) return null;
  const agency = await loadAgency(userId);
  if (!agency) return false;
  if (!agency.hasSubscription && !agency.isTest) return false;
  if ((step ?? 0) < stepNumber("card")) return false;
  return finishWizard(userId, businessId);
}

/**
 * F-48: checkout.session.completed has linked the subscription, but invoice.paid has not granted the trial
 * (or plan) credits yet. The first scan screen waits instead of showing "out of credits". Read only.
 */
export async function awaitingTrialCredits(userId: string): Promise<boolean> {
  const agency = await loadAgency(userId);
  if (!agency?.hasSubscription) return false;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("credit_grants")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agency.id)
    .in("source", ["trial", "plan"]);
  if (error) throw new Error(`Could not load credit grants: ${error.message}`);
  return count === 0;
}
