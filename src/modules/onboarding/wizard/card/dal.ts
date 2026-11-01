import "server-only";
import { appUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import {
  createTrialCheckout,
  getTrialOffer,
  recoverInvoiceCredits,
  recoverPlanCheckout,
  trialAllowed,
  type StartTrialResult,
  type TrialOffer,
} from "@/modules/billing";
import { ownStep } from "../dal";
import { draftPlanId } from "../plan/dal";
import { finishWizard } from "../questions/dal";
import { needsCard, stepNumber, stepPath } from "../steps";

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
      subscriptionId: data.stripe_subscription_id,
      trialAllowed: trialAllowed({ stripeCustomerId: data.stripe_customer_id, stripeSubscriptionId: data.stripe_subscription_id }),
    }
  );
}

/**
 * The card was accepted but the webhook never linked the subscription: links it from Stripe now, so the step finishes
 * instead of offering a second checkout (and a second subscription). True when it did.
 */
async function recovered(user: { id: string; email: string | null }, loaded?: Agency | null): Promise<boolean> {
  const agency = loaded === undefined ? await loadAgency(user.id) : loaded;
  if (!agency || agency.isTest || agency.hasSubscription) return false;
  return recoverPlanCheckout(agency.id, user.email);
}

type Agency = Awaited<ReturnType<typeof loadAgency>>;

/** Where Stripe sends the user back after a bank page: the configured address, never the request's host (BUG-283). */
export const cardReturnUrl = () => `${appUrl()}${stepPath("card")}?session_id={CHECKOUT_SESSION_ID}`;

export type CardStep = {
  offer: TrialOffer | null;
  started: boolean;
  /** The Checkout Session the card form runs on, made with the page (2026-10-29); null when the form must ask for one. */
  clientSecret: string | null;
};

/**
 * What the card step shows, or null when the business is not the user's draft at step 8. `started` when a trial
 * this agency already paid for was found in Stripe; the step then only waits for it. With `withSession`, the Checkout
 * Session is made here too, so Stripe's form loads at once instead of asking our server again after the page loaded
 * (about 7 seconds before the form showed, measured 2026-10-29). Each page load is one visit with one session, as the
 * form's own request was (BUG-105).
 */
export async function loadCardStep(
  user: { id: string; email: string | null },
  businessId: string,
  options: { withSession?: boolean } = {},
): Promise<CardStep | null> {
  const step = await ownStep(user.id, businessId);
  if (step === undefined || (step ?? 0) < stepNumber("card")) return null;
  const [agency, planId] = await Promise.all([loadAgency(user.id), draftPlanId(user.id, businessId)]);
  if (await recovered(user, agency)) return { offer: null, started: true, clientSecret: null };
  const offer = await getTrialOffer(planId);
  const canStart = agency && needsCard(agency, false) && agency.trialAllowed;
  if (!options.withSession || offer?.mode !== "stripe" || !canStart) return { offer, started: false, clientSecret: null };
  return { offer, started: false, clientSecret: await pageSession({ agencyId: agency.id, businessId, email: user.email, planId }) };
}

/** Null on any failure: the form then asks for a session itself and shows that request's error. */
async function pageSession(input: { agencyId: string; businessId: string; email: string | null; planId: string }): Promise<string | null> {
  try {
    const result = await createTrialCheckout({ ...input, returnUrl: cardReturnUrl() });
    return result.ok ? result.clientSecret : null;
  } catch (error) {
    const e = error as { type?: string; message?: string };
    console.error("[onboarding/card] checkout session failed", e?.type ?? e?.message);
    return null;
  }
}

export async function startCardCheckout(
  user: { id: string; email: string | null },
  businessId: string,
  returnUrl: string,
): Promise<StartTrialResult | { ok: false; status: 404 | 409; error: string }> {
  // Read at once (2026-10-29); the agency is the user's own whatever the business.
  const [step, agency, planId] = await Promise.all([ownStep(user.id, businessId), loadAgency(user.id), draftPlanId(user.id, businessId)]);
  if (step === undefined) return { ok: false, status: 404, error: "Business not found." };
  if (!agency) return { ok: false, status: 409, error: "Add your agency name first." };
  // A second session would start a second subscription for the same agency.
  if (!needsCard(agency, false) || (await recovered(user, agency))) return { ok: false, status: 409, error: "Your free trial has already started." };
  if (!agency.trialAllowed) return { ok: false, status: 409, error: "You've already had your free trial. Contact us to start your plan." };
  return createTrialCheckout({ agencyId: agency.id, businessId, email: user.email, returnUrl, planId });
}

/**
 * True once the webhook (or the recovery above) has linked a subscription, or the agency needs no card, and then
 * the business is set up. False while the user waits on "Setting up your account". Null when it is not theirs.
 */
export async function finishCardStep(user: { id: string; email: string | null }, businessId: string): Promise<boolean | null> {
  const [step, agency] = await Promise.all([ownStep(user.id, businessId), loadAgency(user.id)]);
  if (step === undefined) return null;
  if (!agency) return false;
  if (!agency.hasSubscription && !agency.isTest && !(await recovered(user, agency))) return false;
  if ((step ?? 0) < stepNumber("card")) return false;
  return finishWizard(user.id, businessId);
}

/**
 * F-48: checkout.session.completed has linked the subscription, but invoice.paid has not granted the trial
 * (or plan) credits yet. The first scan screen waits instead of showing "out of credits". While it waits, the paid
 * first invoice is read from Stripe and granted, so a missed invoice.paid never leaves the account at 0 (A1).
 */
export async function awaitingTrialCredits(userId: string): Promise<boolean> {
  const agency = await loadAgency(userId);
  if (!agency?.subscriptionId) return false;
  if ((await planGrants(agency.id)) > 0) return false;
  if (agency.isTest || !(await recoverInvoiceCredits(agency.subscriptionId))) return true;
  return (await planGrants(agency.id)) === 0;
}

async function planGrants(agencyId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("credit_grants")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .in("source", ["trial", "plan"]);
  if (error) throw new Error(`Could not load credit grants: ${error.message}`);
  return count ?? 0;
}
