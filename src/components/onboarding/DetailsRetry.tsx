"use client";

import { useState, useTransition } from "react";
import { AutofillFailed } from "./AutofillFailed";
import { saveAutofill } from "./autofill-store";
import type { PlaceChoicesState } from "./PlaceChoices";
import { StepError } from "./StepBits";
import type { FindBusinessAction } from "./WebsiteStep";

/** What the website step sent for this draft, sent again by "Try again". */
export type FindAgainRequest = { domain: string } | { name: string; city: string };

type Props = {
  businessId: string;
  request: FindAgainRequest;
  /** Why auto-fill failed, as the stored result says it (the website blocked us, Google or our AI was down). */
  note: string;
  findAgain: FindBusinessAction;
  /** The new run offers Google listings to pick from. */
  onPicking: (state: PlaceChoicesState) => void;
  /** The new result is stored: the details step reads it again. */
  onDone: () => void;
};

/** The details step after a failed auto-fill (O1): the reason and "Try again", which runs auto-fill for this draft once more. */
export function DetailsRetry({ businessId, request, note, findAgain, onPicking, onDone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function retry() {
    setError(null);
    startTransition(async () => {
      const result = await findAgain({ ...request, retry: true }).catch(() => null);
      if (!result) return setError("We couldn't try again just now. Check your connection and try again.");
      if (!result.ok) return setError(result.error);
      const found = result.data.autofill;
      if (!found) return onDone();
      const { choices, pickNote, ...typed } = found;
      if (choices?.length) {
        const searched = "domain" in request ? request.domain : `${request.name} in ${request.city}`;
        return onPicking({ businessId, typed, choices, searched, note: pickNote });
      }
      saveAutofill(businessId, typed);
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-3" data-testid="details-retry">
      <AutofillFailed note={note} pending={pending} onRetry={retry} />
      <StepError message={error} />
    </div>
  );
}
