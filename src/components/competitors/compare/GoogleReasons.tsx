import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import type { AddToActionsAction } from "@/components/actions/AddToActionsButton";
import { reasonCards, type ReasonCard } from "@/modules/competitors/compare/cards";
import type { SignalRow } from "@/modules/competitors";
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
}: {
  name: string;
  competitorId: string;
  businessId: string;
  signals: Promise<SignalRow[]>;
  states: Record<string, ActionState>;
  add: AddToActionsAction;
}) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  const facts = googleFacts(name, theirs, yours).behind;
  if (facts.length === 0) return null;
  const cards: ReasonCard[] = reasonCards(facts, { id: competitorId, name }, null);
  return (
    <div className="flex flex-col gap-2">
      <ReasonCards
        name={name}
        businessId={businessId}
        cards={cards}
        states={states}
        add={add}
        saved={(c) => SAVED[c.key]?.(name) ?? { fact: `${name} is ahead of you on Google.` }}
      />
      <GoogleAttribution what="Google listing values" />
    </div>
  );
}
