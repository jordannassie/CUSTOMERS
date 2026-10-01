import { formatCount, formatUsd } from "../format";
import type { PlanChange } from "./planner";

// The words for each change, before and after confirming (MVP_SPEC 11.5, WRITING.md). Pure, so tests pin them.

export function formatDate(seconds: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(seconds * 1000),
  );
}

export type CopyInput = {
  change: PlanChange;
  trialing: boolean;
  businessName: string | null;
  planName: string | null;
  planPriceCents: number | null;
  /** Charged today for changes made now; the next bill for changes at period end. */
  amountCents: number;
  extraCredits: number;
  effectiveAt: number;
};

export type Copy = { headline: string; details: string[] };

const perMonth = (cents: number | null) => (cents === null ? "" : `${formatUsd(cents)} a month`);

export function previewCopy(input: CopyInput): Copy {
  const date = formatDate(input.effectiveAt);
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
    case "cancel": {
      const topups = "Top-up credits stay on your account, but you can only use them with an active plan.";
      if (input.trialing) {
        return {
          headline: `Your free trial ends on ${date}. Your trial credits work until then.`,
          details: ["Your card won't be charged.", topups],
        };
      }
      return {
        headline: `Your plan ends on ${date}. Your plan credits work until then.`,
        details: ["You won't be charged again, and there's no refund for this month.", topups],
      };
    }
    case "keep":
      return { headline: `Your plan will keep going after ${date}.`, details: [] };
  }
}

export function doneCopy(input: Pick<CopyInput, "change" | "businessName" | "planName" | "effectiveAt" | "trialing">): string {
  const date = formatDate(input.effectiveAt);
  const business = input.businessName ?? "The business";
  switch (input.change.kind) {
    case "upgrade":
      return `${business} is now on ${input.planName}. The extra credits appear once the payment goes through.`;
    case "add":
      return `${business} is on your plan. Its credits appear once the payment goes through.`;
    case "downgrade":
      return `${business} moves to ${input.planName} on ${date}.`;
    case "remove":
      return `${business} comes off your plan on ${date}.`;
    case "cancel":
      return input.trialing ? `Your free trial ends on ${date}. You won't be charged.` : `Your plan ends on ${date}.`;
    case "keep":
      return "Your plan will keep going.";
  }
}
