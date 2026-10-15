"use server";

import { z } from "zod";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { CHOOSE_PLAN_HREF } from "@/modules/workspace";
import { checkoutFixtures, liveCheckoutClient } from "../checkout-client";
import { recoverPlanCheckout } from "../checkout-recovery";
import { getPlanPrice } from "../dal";
import { appOrigin } from "../origin";
import { planPriceData } from "../plan-price";
import { loadChoosePlanAgency, loadChoosePlanRows } from "./dal";
import { planSessionParams } from "./params";
import { choosePlanState, planStarted } from "./service";

// Choose plan (BUG-079, BUG-066). Each action checks auth itself; the agency always comes from the session. The agency
// is marked paid only from what Stripe says, through the webhook's own handlers (MVP_SPEC 11.3, A1).

const planInput = z.object({ planId: z.string().regex(/^[a-z0-9_]{1,64}$/) });
const badInput = { ok: false, status: 400, error: "Something was wrong with that request. Refresh the page and try again." } as const;
const unavailable = { ok: false, status: 503, error: "Choosing a plan isn't available right now. Please try again later." } as const;

/** Starts the Checkout Session the card form runs on: one item per set-up business on the chosen plan. */
export async function startPlanCheckout(input: unknown): Promise<ActionResult<{ clientSecret: string }>> {
  let session;
  try {
    session = await requireAgency();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = planInput.safeParse(input);
  if (!parsed.success) return badInput;

  const rows = await loadChoosePlanRows(session.agency.id);
  const state = choosePlanState(rows);
  // A second subscription would bill the same businesses twice.
  if (state.kind === "has_plan") return { ok: false, status: 409, error: "You already have a plan. Change it on the Billing page." };
  if (state.kind === "no_business") return { ok: false, status: 409, error: "Set up a business first, then choose its plan." };

  const client = liveCheckoutClient();
  if (!client) return unavailable;
  const plan = await getPlanPrice(parsed.data.planId);
  if (!plan) return { ok: false, status: 400, error: "That plan isn't available. Pick another plan." };
  // Fixture mode runs before the Stripe catalog exists locally, so the price ID may still be empty.
  // The catalog sync made the plan's product; fixture mode runs before the catalog exists locally.
  if (!plan.stripePriceId && !checkoutFixtures()) {
    console.error(`[billing] plan ${plan.id} has no Stripe price; run the catalog sync (README.md)`);
    return unavailable;
  }

  const created = await client.createSession(
    planSessionParams({
      agencyId: session.agency.id,
      businessIds: rows.businesses.map((b) => b.id),
      price: planPriceData(plan),
      customerId: rows.agency.customerId,
      email: session.user.email,
      trial: state.trial,
      returnUrl: `${await appOrigin()}${CHOOSE_PLAN_HREF}?session_id={CHECKOUT_SESSION_ID}`,
    }),
  );
  return { ok: true, data: { clientSecret: created.clientSecret } };
}

/**
 * Polled after the card is accepted, and run by "Check again": true once the plan has started. Until then each call
 * looks for the completed checkout in Stripe and applies it with the webhook's own handler, so a missed webhook
 * never leaves the page waiting (A1, 2026-10-15).
 */
export async function getPlanStartStatus(): Promise<ActionResult<{ started: boolean }>> {
  let session;
  try {
    session = await requireAgency();
  } catch (error) {
    return authFailure(error);
  }
  const agencyId = session.agency.id;
  if (planStarted(await loadChoosePlanAgency(agencyId))) return { ok: true, data: { started: true } };
  await recoverPlanCheckout(agencyId, session.user.email ?? null);
  return { ok: true, data: { started: planStarted(await loadChoosePlanAgency(agencyId)) } };
}
