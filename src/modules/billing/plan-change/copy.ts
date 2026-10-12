import { formatCount, formatUsd } from "../format";
import type { PlanChange } from "./planner";

// The words for each change, before and after confirming (MVP_SPEC 11.5, WRITING.md). Pure, so tests pin them.

/** In the viewer's zone, like Billing's own dates (BUG-111); UTC when unknown. */
export function formatDate(seconds: number, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone }).format(
    new Date(seconds * 1000),
  );
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
};

export type Copy = { headline: string; details: string[] };

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
  const noRefund = `Takes effect on ${date}. No refund.`;
  const creditsStay = "Credits you already have stay until they expire.";

  switch (input.change.kind) {
    case "upgrade":
    case "add": {
      const cost = `${business} will cost ${perMonth(input.planPriceCents)} on ${input.planName}.`;
      if (input.trialing) {
        return {
          headline: "You pay nothing today. You're still on your free trial.",
          details: [`From ${date}, ${cost}`],
        };
      }
      return {
        headline: `You'll pay ${formatUsd(input.amountCents)} today and get ${formatCount(input.extraCredits)} extra credits now.`,
        details: ["The credits appear as soon as the payment goes through.", cost],
      };
    }
    case "downgrade":
      return {
        headline: noRefund,
        details: [
          `From then, ${business} is on ${input.planName} at ${perMonth(input.planPriceCents)}.`,
          `Your next bill will be ${formatUsd(input.amountCents)}.`,
          creditsStay,
        ],
      };
    case "remove":
      return {
        headline: noRefund,
        details: [
          `Scans for ${business} stop on that day.`,
          `Your next bill will be ${formatUsd(input.amountCents)}.`,
          creditsStay,
        ],
      };
    case "keepBusiness":
      return {
        headline: `${business} stays on your plan${input.planName ? `, on ${input.planName}` : ""}.`,
        details: ["The change you scheduled is canceled. Nothing is charged now."],
      };
    case "cancel": {
      const topups = "Top-up credits stay on your account, but you can only use them with an active plan.";
      if (input.trialing) {
        return {
          headline: `Your free trial ends on ${date}. Your trial credits work until then.`,
          details: ["Your card won't be charged.", topups, ...droppedLines(input.scheduled)],
        };
      }
      return {
        headline: `Your plan ends on ${date}. Your plan credits work until then.`,
        details: ["You won't be charged again, and there's no refund for this month.", topups, ...droppedLines(input.scheduled)],
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
      return `${business} moves to ${input.planName} on ${date}.`;
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
