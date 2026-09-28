"use server";

import { headers } from "next/headers";
import type Stripe from "stripe";
import { z } from "zod";
import { env } from "@/lib/env";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { getBalance } from "@/modules/credits";
import { canSpendTopUps } from "@/modules/entitlements";
import { BUY_CREDITS_HREF } from "@/modules/workspace";
import { listTopupPacks } from "../dal";
import { liveTopupClient, topupFixtures } from "./client";
import { agencyCustomerId, topupGrantFor } from "./dal";
import { buyTopUp as buyTopUpWith, completeFixtureTopUp as completeFixture } from "./service";
import { createWebhookStore } from "../webhooks/dal";
import { sendBillingEmail } from "../webhooks/emails";
import { dispatchEvent } from "../webhooks/handlers";

// Buy credits (B-43, MVP_SPEC 4.2, D-22). Each action checks auth itself; the agency always comes from the session.

const packInput = z.object({ packId: z.string().regex(/^[a-z0-9_]{1,64}$/) });
const sessionInput = z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_-]{1,200}$/) });
const badInput = { ok: false, status: 400, error: "Something was wrong with that request. Refresh the page and try again." } as const;

async function appOrigin(): Promise<string> {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Starts a one-time Checkout Session for one pack; the card form confirms it in the browser. */
export async function buyTopUp(input: unknown): Promise<ActionResult<{ sessionId: string; clientSecret: string }>> {
  let session;
  try {
    session = await requireAgency();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = packInput.safeParse(input);
  if (!parsed.success) return badInput;

  return buyTopUpWith(
    { client: liveTopupClient(), loadPacks: listTopupPacks, canSpendTopUps, customerId: agencyCustomerId },
    {
      agencyId: session.agency.id,
      email: session.user.email,
      packId: parsed.data.packId,
      returnUrl: `${await appOrigin()}${BUY_CREDITS_HREF}?session_id={CHECKOUT_SESSION_ID}`,
    },
  );
}

export type TopUpStatus = { credited: number | null; balance: number };

/** Polled after paying: whether the webhook has added this session's credits, and the balance now. */
export async function getTopUpStatus(input: unknown): Promise<ActionResult<TopUpStatus>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = sessionInput.safeParse(input);
  if (!parsed.success) return badInput;

  const [credited, balance] = await Promise.all([topupGrantFor(agencyId, parsed.data.sessionId), getBalance(agencyId)]);
  return { ok: true, data: { credited, balance: balance.balance ?? 0 } };
}

/** Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES): the fixture card form's stand-in for Stripe's webhook. */
export async function completeFixtureTopUp(input: unknown): Promise<ActionResult<{ done: true }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = sessionInput.merge(packInput).safeParse(input);
  if (!parsed.success) return badInput;

  const deps = {
    store: createWebhookStore(),
    stripe: {
      retrieveSubscription: () => Promise.reject(new Error("not used for top-ups")),
      listSubscriptionItems: () => Promise.reject(new Error("not used for top-ups")),
      listInvoiceLines: () => Promise.reject(new Error("not used for top-ups")),
    },
    sendEmail: sendBillingEmail,
    now: () => new Date(),
  };
  const done = await completeFixture(
    {
      fixtures: topupFixtures(),
      dispatch: (object) =>
        dispatchEvent(deps, { id: `evt_fixture_${object.id}`, type: "checkout.session.completed", data: { object } } as Stripe.Event),
    },
    { agencyId, ...parsed.data },
  );
  return done ? { ok: true, data: { done: true } } : { ok: false, status: 404, error: "Not found." };
}
