import { customerDate } from "@/lib/time-zone";
import { formatCount, formatUsd } from "../format";
import type { PlanChange } from "./planner";

// The words for each change, before and after confirming (MVP_SPEC 11.5, WRITING.md). Pure, so tests pin them.

/** In the viewer's zone, like Billing's own dates (BUG-111); UTC when unknown. */
export function formatDate(seconds: number, timeZone = "UTC"): string {
  return customerDate(new Date(seconds * 1000), timeZone);
}

/** A change scheduled for the period end that a cancel drops, or "Keep my plan" puts back (BUG-124). */
export type ScheduledNote = { businessName: string; /** Null: the business comes off the plan. */ planName: string | null };

export type CopyInput = {
  change: PlanChange;
  trialing: boolean;
  businessName: string | null;
  planName: string | null;
  planPriceCents: number | null;
  /** Charged today for changes made now; the next bill for changes at period end. */
  amountCents: number;
  extraCredits: number;
  timeZone?: string;
  effectiveAt: number;
  scheduled?: ScheduledNote[];
  /** Credits left now, for a cancel or a removal: plan or trial credits, and top-ups. Unknown when absent. */
  credits?: { plan: number; topup: number };
  /** During a trial: the first bill after it, with this change made (trial-bill.ts, BUG-245). */
  firstBillCents?: number | null;
};

/** What stops on the end date of a cancel or a removal, listed under the heading. */
export type Losses = { heading: string; items: string[] };

export type Copy = { headline: string; details: string[]; losses?: Losses };

// What an ended plan stops (entitlements: no scans, no edits; jobs: no weekly scans, so no new scores, competitor
// checks or fixes). Results, share links and top-up credits stay: nothing deletes a cancelled account's data.
const LOST = ["Weekly scans and Run scan", "Score updates", "Competitor tracking", "New opportunities"];

/** Plan or trial credits end with the period; top-ups stay but need an active plan (entitlements canSpendTopUps). */
function creditLines(credits: CopyInput["credits"], trialing: boolean, date: string): string[] {
  const kind = trialing ? "trial" : "plan";
  const left = credits
    ? `You have ${formatCount(credits.plan)} ${kind} ${credits.plan === 1 ? "credit" : "credits"} left. Any left on ${date} are removed.`
    : `Any ${kind} credits left on ${date} are removed.`;
  const topups =
    credits && credits.topup > 0
      ? credits.topup === 1
        ? "Your 1 top-up credit stays on your account, but you can only use it with an active plan."
        : `Your ${formatCount(credits.topup)} top-up credits stay on your account, but you can only use them with an active plan.`
      : "Top-up credits stay on your account, but you can only use them with an active plan.";
  return [left, topups];
}

/** What a cancel does to each scheduled change, and that keeping the plan brings them back. */
function droppedLines(scheduled: ScheduledNote[] = []): string[] {
  if (scheduled.length === 0) return [];
  const lines = scheduled.map((s) =>
    s.planName === null
      ? `Your change to take ${s.businessName} off your plan is also canceled.`
      : `Your change to ${s.planName} for ${s.businessName} is also canceled.`,
  );
  return [...lines, scheduled.length === 1 ? "If you keep your plan, this change comes back." : "If you keep your plan, these changes come back."];
}

/** Each scheduled change that "Keep my plan" puts back, as it will happen. */
function keptLines(scheduled: ScheduledNote[] = [], date: string, still = ""): string[] {
  return scheduled.map((s) =>
    s.planName === null
      ? `${s.businessName} ${still}comes off your plan on ${date}.`
      : `${s.businessName} ${still}moves to ${s.planName} on ${date}.`,
  );
}

const perMonth = (cents: number | null) => (cents === null ? "" : `${formatUsd(cents)} a month`);

export function previewCopy(input: CopyInput): Copy {
  const date = formatDate(input.effectiveAt, input.timeZone);
  const business = input.businessName ?? "this business";
  const creditsStay = "Credits you already have stay until they expire.";
  // During a trial Stripe's own preview is the trial's $0 invoice, so the bill comes from the plan prices (BUG-245).
  const nextBill = (cents: number) => `Your next bill will be ${formatUsd(cents)}.`;
  const firstBill = input.firstBillCents != null ? [`Your first bill on ${date} will be ${formatUsd(input.firstBillCents)}.`] : [];
  const trialSwitch = (): Copy => ({
    headline: "You pay nothing today. You're still on your free trial.",
    details: [
      `From ${date}, ${business} will cost ${perMonth(input.planPriceCents)} on ${input.planName}.`,
      ...firstBill,
      "You can switch plans again any time before then.",
    ],
  });

  switch (input.change.kind) {
    case "upgrade":
    case "add": {
      const cost = `${business} will cost ${perMonth(input.planPriceCents)} on ${input.planName}.`;
      if (input.trialing) return trialSwitch();
      return {
        headline: `You'll pay ${formatUsd(input.amountCents)} today and get ${formatCount(input.extraCredits)} extra credits now.`,
        details: ["The credits appear as soon as the payment goes through.", cost],
      };
    }
    case "downgrade":
      // In a trial the switch happens now (timingOf), and nothing has been paid to refund.
      if (input.trialing) return trialSwitch();
      return {
        headline: `${business} moves to ${input.planName} on ${date}, when your plan renews.`,
        details: [
          "Until then it stays on its current plan. There's no refund for this month.",
          `From ${date} it costs ${perMonth(input.planPriceCents)}.`,
          nextBill(input.amountCents),
          creditsStay,
        ],
      };
    case "remove":
      // During a trial nothing was paid, so there is nothing to refund: the business comes off when the trial ends.
      return {
        headline: input.trialing
          ? `${business} stays on your trial until ${date}. You won't be charged for it.`
          : `${business} stays on your plan until ${date}. No refund.`,
        details: [
          `After that, scans for ${business} stop. Its results stay visible.`,
          ...(input.trialing && firstBill.length ? firstBill : [nextBill(input.amountCents)]),
          creditsStay,
          `You can keep ${business} on your plan any time before ${date}.`,
        ],
        losses: { heading: `From ${date}, ${business} loses:`, items: LOST },
      };
    case "keepBusiness":
      return {
        headline: `${business} stays on your plan${input.planName ? `, on ${input.planName}` : ""}.`,
        details: ["The change you scheduled is canceled. Nothing is charged now."],
      };
    case "cancel": {
      // Cancelling never ends anything at once (cancel_at_period_end): the trial or the paid month runs to its end.
      const stays = [
        `Your results, past scans and share links stay. From ${date}, questions, competitors and business details can't be changed.`,
        `You can keep your plan any time before ${date}.`,
      ];
      const losses = { heading: `From ${date} you lose:`, items: LOST };
      const credits = creditLines(input.credits, input.trialing, date);
      if (input.trialing) {
        return {
          headline: `Your free trial keeps going until ${date}. Your card won't be charged.`,
          details: [...credits, ...stays, ...droppedLines(input.scheduled)],
          losses,
        };
      }
      return {
        headline: `Your plan stays active until ${date}. You won't be charged again, and there's no refund for this month.`,
        details: [...credits, ...stays, ...droppedLines(input.scheduled)],
        losses,
      };
    }
    case "keep":
      return { headline: `Your plan will keep going after ${date}.`, details: keptLines(input.scheduled, date, "still ") };
  }
}

export function doneCopy(
  input: Pick<CopyInput, "change" | "businessName" | "planName" | "effectiveAt" | "trialing" | "timeZone" | "scheduled">,
): string {
  const date = formatDate(input.effectiveAt, input.timeZone);
  const business = input.businessName ?? "The business";
  // Nothing is paid during a trial (B2), so there is no payment to wait for. `effectiveAt` is then the trial end.
  const notCharged = `You won't be charged until your trial ends on ${date}.`;
  switch (input.change.kind) {
    case "upgrade":
      if (input.trialing) return `${business} is now on ${input.planName}. ${notCharged}`;
      return `${business} is now on ${input.planName}. The extra credits appear once the payment goes through.`;
    case "add":
      if (input.trialing) return `${business} is on your plan. ${notCharged}`;
      return `${business} is on your plan. Its credits appear once the payment goes through.`;
    case "downgrade":
      if (input.trialing) return `${business} is now on ${input.planName}. ${notCharged}`;
      return `${business} stays on its current plan until ${date}, then moves to ${input.planName}.`;
    case "remove":
      return `${business} comes off your plan on ${date}.`;
    case "keepBusiness":
      return `${business} stays on your plan${input.planName ? `, on ${input.planName}` : ""}.`;
    case "cancel": {
      const ends = input.trialing ? `Your free trial ends on ${date}. You won't be charged.` : `Your plan ends on ${date}.`;
      const count = input.scheduled?.length ?? 0;
      if (count === 0) return ends;
      return count === 1
        ? `${ends} Your scheduled change is also canceled. It comes back if you keep your plan.`
        : `${ends} Your scheduled changes are also canceled. They come back if you keep your plan.`;
    }
    case "keep":
      return ["Your plan will keep going.", ...keptLines(input.scheduled, date)].join(" ");
  }
}
