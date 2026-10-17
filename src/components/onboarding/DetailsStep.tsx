"use client";

import { useState } from "react";
import type { ActionResult } from "@/modules/auth";
import type { BusinessDetails } from "@/modules/onboarding/schema";
import { useStoredAutofill } from "./autofill-store";
import { AutofillNote } from "./AutofillNote";
import { DetailsForm } from "./DetailsForm";
import { DetailsRetry, type FindAgainRequest } from "./DetailsRetry";
import { PlaceChoices, type PickPlaceAction, type PlaceChoicesState } from "./PlaceChoices";
import type { FindBusinessAction } from "./WebsiteStep";

export type DetailsInput = {
  businessId: string;
  name: string;
  industry: string;
  description: string;
  services: string[];
  /** Other names customers and AI use for the business. */
  aliases: string[];
  city: string;
  state: string;
  country: string;
  /** Neighborhood or area; empty saves none. */
  area: string;
  phone: string;
};

export type DetailsStepProps = {
  businessId: string;
  /** The website typed on the previous step, for the brand name suggestion (BUG-097). */
  domain?: string | null;
  details: BusinessDetails;
  industryText: string;
  /** Other names the user saved before, if they came back to this step. */
  aliases: string[];
  /** Already confirmed once: show saved values, not a stale auto-fill. */
  confirmed: boolean;
  save: (input: DetailsInput) => Promise<ActionResult<null>>;
  /** What the website step sent, for "Try again" after a failed auto-fill (O1); null offers none. */
  findAgainRequest: FindAgainRequest | null;
  findAgain: FindBusinessAction;
  pick: PickPlaceAction;
};

// MVP_SPEC 3.1 step 4: the user confirms or edits what auto-fill found.
export function DetailsStep(props: DetailsStepProps) {
  // Bumped once "Try again" stored a new result, so the store is read again.
  const [, setRound] = useState(0);
  const [picking, setPicking] = useState<PlaceChoicesState | null>(null);
  const stored = useStoredAutofill(props.businessId);
  const fresh = props.confirmed ? null : stored;
  const reread = () => setRound((n) => n + 1);
  if (picking) {
    const done = () => {
      setPicking(null);
      reread();
    };
    return <PlaceChoices {...picking} pick={props.pick} onBack={() => setPicking(null)} onPicked={done} />;
  }
  // Keyed by what it shows: the app keeps a visited step's form, so going Back and entering another website kept
  // the old business's name and details in it until a reload (2026-10-13). New auto-fill now starts a new form.
  const key = fresh ? `autofill:${JSON.stringify(fresh.details)}` : `saved:${props.domain ?? ""}:${props.details.name}`;
  const retry = fresh?.failed && fresh.note && props.findAgainRequest ? { note: fresh.note, request: props.findAgainRequest } : null;
  const notice = (
    <>
      <AutofillNote autofill={fresh} hideNote={retry !== null} />
      {retry ? (
        <DetailsRetry businessId={props.businessId} {...retry} findAgain={props.findAgain} onPicking={setPicking} onDone={reread} />
      ) : null}
    </>
  );
  return <DetailsForm key={key} {...props} autofill={fresh} notice={notice} />;
}
