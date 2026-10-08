"use server";

import { z } from "zod";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { CHOOSE_PLAN_HREF } from "@/modules/workspace";
import { checkoutFixtures, liveCheckoutClient } from "../checkout-client";
import { getPlanPrice } from "../dal";
import { appOrigin } from "../origin";
import { loadChoosePlanAgency, loadChoosePlanRows } from "./dal";
import { planSessionParams } from "./params";
import { choosePlanState, planStarted } from "./service";

// Choose plan (BUG-079, BUG-066). Each action checks auth itself; the agency always comes from the session. Nothing
// here marks the agency paid: only the Stripe webhook does that (MVP_SPEC 11.3).

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
  const priceId = plan.stripePriceId ?? (checkoutFixtures() ? `price_fixture_${plan.id}` : null);
  if (!priceId) {
    console.error(`[billing] plan ${plan.id} has no Stripe price; run the catalog sync (README.md)`);
    return unavailable;
  }

  const created = await client.createSession(
    planSessionParams({
      agencyId: session.agency.id,
      businessIds: rows.businesses.map((b) => b.id),
      priceId,
      customerId: rows.agency.customerId,
      email: session.user.email,
      trial: state.trial,
      returnUrl: `${await appOrigin()}${CHOOSE_PLAN_HREF}?session_id={CHECKOUT_SESSION_ID}`,
    }),
  );
  return { ok: true, data: { clientSecret: created.clientSecret } };
}

/** Polled after the card is accepted: true once the webhook has started the plan. */
export async function getPlanStartStatus(): Promise<ActionResult<{ started: boolean }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  return { ok: true, data: { started: planStarted(await loadChoosePlanAgency(agencyId)) } };
}
