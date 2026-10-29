import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import type { MoveAction } from "@/components/actions/ActionsBoard";
import type { AddToActionsAction } from "@/components/actions/AddToActionsButton";
import { googleReasonCards, type SignalRow, type WhyPanel } from "@/modules/competitors";
import type { ActionState } from "@/modules/opportunities/board/service";
import { googleFacts } from "@/modules/standing";
import { ReasonCards } from "./ReasonCards";

/**
 * Google reasons on Compare ("More Google reviews"), from the live values fetched for this view (D-73). Shown with
 * the numbers; what "Add to Actions" saves leaves Google's values out, since they may not be stored.
 */
const SAVED: Record<string, (name: string) => { fact: string; whatToDo?: string }> = {
  "google:reviews": (n) => ({ fact: `${n} has more Google reviews than you.` }),
  "google:rating": (n) => ({ fact: `${n} has a higher Google rating than you.` }),
  "google:hours": (n) => ({ fact: `Google shows ${n} open more days a week than you.` }),
  "google:category": (n) => ({
    fact: `Google lists ${n} under a different category from you.`,
    whatToDo: "Check your Google categories and add the one that best describes what you do.",
  }),
};

export async function GoogleReasons({
  name,
  competitorId,
  businessId,
  signals,
  states,
  add,
  move,
  fixes,
}: {
  /** The tracked branch's name: these are its own Google values, never the whole chain's. */
  name: string;
  competitorId: string;
  businessId: string;
  signals: Promise<SignalRow[]>;
  states: Record<string, ActionState>;
  add: AddToActionsAction;
  /** "Move to To do" for a reason the scan already saved a fix for (moved, never copied). */
  move?: MoveAction;
  /** The open saved fixes, so a reason the scan already has a fix for links to it instead of adding a copy. */
  fixes: WhyPanel["fixRefs"];
}) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  // The table above says when Google can't be compared or when they are not ahead; this adds only where they are.
  const facts = googleFacts(name, theirs, yours).behind;
  if (facts.length === 0) return null;
  const cards = googleReasonCards(facts, { id: competitorId, name }, fixes);
  return (
    <section className="flex flex-col gap-2" data-testid="google-reasons">
      <h3 className="text-sm font-semibold">Where they beat you on Google</h3>
      <ReasonCards
        name={name}
        businessId={businessId}
        cards={cards}
        states={states}
        add={add}
        move={move}
        saved={(c) => SAVED[c.key]?.(name) ?? { fact: `${name} is ahead of you on Google.` }}
      />
      <GoogleAttribution what="Google listing values" />
    </section>
  );
}
