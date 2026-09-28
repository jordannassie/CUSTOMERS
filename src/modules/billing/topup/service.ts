import "server-only";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import type { Entitlement } from "@/modules/entitlements";
import { listTopupPacks } from "../dal";
import { FIXTURE_SESSION_PREFIX, liveTopupClient, type TopupCheckoutClient } from "./client";
import { checkTopupPurchase, topupSessionParams, TOPUP_ERRORS, type TopupPackPrice } from "./params";

// Buying credits, server side (B-43). Nothing here grants credits: only the webhook does, after Stripe
// confirms the payment (MVP_SPEC 11.3). Everything outside comes in as deps so tests make no Stripe calls.

export type TopupFormMode = "stripe" | "fixture" | "off";

export type TopupOffer = {
  packs: Pick<TopupPackPrice, "id" | "name" | "credits" | "priceCents">[];
  mode: TopupFormMode;
  publishableKey: string | null;
};

/** The packs and which card form the page shows. */
export async function getTopupOffer(
  client: TopupCheckoutClient | null = liveTopupClient(),
  loadPacks: () => Promise<TopupPackPrice[]> = listTopupPacks,
): Promise<TopupOffer> {
  const packs = await loadPacks();
  const mode = client?.mode ?? "off";
  return {
    packs: packs.map(({ id, name, credits, priceCents }) => ({ id, name, credits, priceCents })),
    mode,
    publishableKey: mode === "stripe" ? (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null,
  };
}

export type BuyTopUpDeps = {
  client: TopupCheckoutClient | null;
  loadPacks: () => Promise<TopupPackPrice[]>;
  canSpendTopUps: (agencyId: string) => Promise<Entitlement>;
  customerId: (agencyId: string) => Promise<string | null>;
};

export type BuyTopUpInput = { agencyId: string; email: string | null; packId: string; returnUrl: string };

export type BuyTopUpResult =
  | { ok: true; data: { sessionId: string; clientSecret: string } }
  | { ok: false; status: number; error: string };

/** Creates the one-time Checkout Session the card form runs on. */
export async function buyTopUp(deps: BuyTopUpDeps, input: BuyTopUpInput): Promise<BuyTopUpResult> {
  if (!deps.client) return { ok: false, status: 503, error: TOPUP_ERRORS.unavailable };
  const [packs, spend] = await Promise.all([deps.loadPacks(), deps.canSpendTopUps(input.agencyId)]);
  // Fixture mode runs before the Stripe catalog exists locally, so the price ID may still be empty.
  const priced = deps.client.mode === "fixture" ? packs.map((p) => ({ ...p, stripePriceId: p.stripePriceId ?? `price_fixture_${p.id}` })) : packs;
  const check = checkTopupPurchase(priced, input.packId, spend);
  if (!check.ok) {
    if (check.status === 503) console.error(`[billing] top-up ${input.packId} has no Stripe price; run the catalog sync (README.md)`);
    return check;
  }

  const session = await deps.client.createSession(
    topupSessionParams({
      agencyId: input.agencyId,
      pack: check.pack,
      customerId: await deps.customerId(input.agencyId),
      email: input.email,
      returnUrl: input.returnUrl,
    }),
  );
  return { ok: true, data: { sessionId: session.id, clientSecret: session.clientSecret } };
}

/**
 * Dev and Playwright only: plays the part of Stripe's checkout.session.completed for a fixture session, through
 * the real webhook handler, so the credits come from grant_credits exactly as they would after a real payment.
 */
export async function completeFixtureTopUp(
  deps: { fixtures: boolean; dispatch: (session: Stripe.Checkout.Session) => Promise<unknown> },
  input: { agencyId: string; sessionId: string; packId: string },
): Promise<boolean> {
  if (!deps.fixtures || !input.sessionId.startsWith(FIXTURE_SESSION_PREFIX)) return false;
  const metadata = { agency_id: input.agencyId, kind: "topup", topup_pack_id: input.packId };
  await deps.dispatch({
    id: input.sessionId,
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    status: "complete",
    customer: null,
    client_reference_id: input.agencyId,
    metadata,
  } as unknown as Stripe.Checkout.Session);
  return true;
}
