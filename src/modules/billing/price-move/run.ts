import "server-only";
import { randomUUID } from "node:crypto";
import { findEmailKeyStates, sendEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";
import { stripePlanChangeClient, type PlanChangeStripe } from "../plan-change/client";
import { scheduleIdOf } from "../plan-change/planner";
import { getStripe, isStripeConfigured } from "../stripe";
import { topupFixtures } from "../topup/client";
import {
  agencyOwnerEmail,
  forgetMoves,
  loadMoveContext,
  priceMoveCandidates,
  recentPriceNotices,
  recordMoves,
  saveItemPrices,
  type MoveAgency,
  type PriceNotice,
} from "./dal";
import { priceChangeEmail, priceChangeKey } from "./emails";
import { planPriceMoves, priceMoveKey } from "./service";

// The hourly price move job (D-93, run_email_job('price_changes')): moves each subscription still on an old plan
// amount to the plan's price now, from its next renewal, then emails each agency once about its change. Netlify ends
// a request after about 10 seconds, so a run stops starting agencies after TIME_BUDGET_MS; the next run continues.

export const TIME_BUDGET_MS = 7_000;

export type PriceMoveSummary = { moved: number; checked: number; sent: number; skipped: number; failed: number; remaining: number };

export type PriceMoveDeps = {
  stripe: PlanChangeStripe | null;
  candidates: () => Promise<MoveAgency[]>;
  context: typeof loadMoveContext;
  record: typeof recordMoves;
  forget: typeof forgetMoves;
  savePrices: typeof saveItemPrices;
  notices: (now: Date) => Promise<PriceNotice[]>;
  ownerEmail: (agencyId: string) => Promise<string | null>;
  sentKeys: (keys: string[]) => Promise<Set<string>>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
  now: () => Date;
};

function liveDeps(): PriceMoveDeps {
  // Only the real Stripe: the dev and Playwright fake keeps no subscriptions between requests.
  const stripe = isStripeConfigured() && !topupFixtures() ? stripePlanChangeClient(getStripe()) : null;
  return {
    stripe,
    candidates: priceMoveCandidates,
    context: loadMoveContext,
    record: recordMoves,
    forget: forgetMoves,
    savePrices: saveItemPrices,
    notices: recentPriceNotices,
    ownerEmail: agencyOwnerEmail,
    sentKeys: async (keys) => (await findEmailKeyStates(keys)).handled,
    send: sendEmail,
    now: () => new Date(),
  };
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function runPriceMoves(overrides: Partial<PriceMoveDeps> = {}): Promise<PriceMoveSummary> {
  const deps = { ...liveDeps(), ...overrides };
  const summary: PriceMoveSummary = { moved: 0, checked: 0, sent: 0, skipped: 0, failed: 0, remaining: 0 };
  const started = deps.now().getTime();
  const outOfTime = () => deps.now().getTime() - started >= TIME_BUDGET_MS;

  if (deps.stripe) {
    for (const agency of await deps.candidates()) {
      if (outOfTime()) {
        summary.remaining++;
        continue;
      }
      try {
        const sub = await deps.stripe.retrieveSubscription(agency.subscriptionId);
        const scheduleId = scheduleIdOf(sub);
        const schedule = scheduleId ? await deps.stripe.retrieveSchedule(scheduleId) : null;
        const { plans, businesses } = await deps.context(agency.id);
        const plan = planPriceMoves({ sub, schedule, plans, businesses });
        if (plan.update) {
          const batch = randomUUID();
          await deps.record(agency.id, plan, batch);
          const key = priceMoveKey(sub.id, plan.moves, plan.startsAt);
          try {
            // No proration: nothing is charged now, and the next renewal bills the new price.
            if (plan.update.kind === "subscription") {
              await deps.stripe.updateSubscription(sub.id, { items: plan.update.items, proration_behavior: "none" }, key);
            } else {
              await deps.stripe.updateSchedule(plan.update.scheduleId, { phases: plan.update.phases, proration_behavior: "none" }, key);
            }
          } catch (error) {
            await deps.forget(batch);
            throw error;
          }
        }
        await deps.savePrices(agency.id, plan.prices);
        summary.checked++;
        if (plan.moves.length > 0) summary.moved++;
      } catch (error) {
        // One agency's Stripe problem must not stop the others; it is tried again next hour.
        console.error(`[billing/price-move] agency ${agency.id}: ${errorText(error)}`);
        summary.failed++;
      }
    }
  }

  const notices = await deps.notices(deps.now());
  const sent = await deps.sentKeys(notices.map((n) => priceChangeKey(n.batch)));
  for (const notice of notices.filter((n) => !sent.has(priceChangeKey(n.batch)))) {
    if (outOfTime()) {
      summary.remaining++;
      continue;
    }
    try {
      const to = await deps.ownerEmail(notice.agencyId);
      if (!to) {
        summary.skipped++;
        continue;
      }
      const result = await deps.send(priceChangeEmail({ to, notice }));
      summary[result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed"]++;
    } catch (error) {
      console.error(`[billing/price-move] email for agency ${notice.agencyId}: ${errorText(error)}`);
      summary.failed++;
    }
  }
  return summary;
}
