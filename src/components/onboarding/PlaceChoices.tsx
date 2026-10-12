"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/modules/auth";
import type { AutofillResult, PlaceChoice } from "@/modules/onboarding/schema";
import { saveAutofill } from "./autofill-store";
import { GoogleAttribution } from "./PlaceBits";
import { StepActions, StepError } from "./StepBits";

export type PickPlaceAction = (input: { businessId: string; placeId: string | null }) => Promise<ActionResult<null>>;

type Props = {
  businessId: string;
  /** What the user searched for, "Sunrise Coffee in Springfield". */
  searched: string;
  choices: PlaceChoice[];
  /** The form with only what the user typed, for "None of these". */
  typed: AutofillResult;
  pick: PickPlaceAction;
  onBack: () => void;
};

const NONE = "none";

// MVP_SPEC 3.3, 26: with no website, the Google listings for the name and city are only offered. Nothing from
// them fills the form, and no place_id is saved, until the user picks one. "None of these" keeps what they typed.
export function PlaceChoices({ businessId, searched, choices, typed, pick, onBack }: Props) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return setError("Choose your business, or None of these.");
    const choice = choices.find((c) => c.placeId === chosen) ?? null;
    setError(null);
    startTransition(async () => {
      const result = await pick({ businessId, placeId: choice?.placeId ?? null });
      if (!result.ok) return setError(result.error);
      saveAutofill(businessId, choice ? choice.autofill : typed);
      router.push("/onboarding/details");
    });
  }

  const select = (value: string) => {
    setChosen(value);
    setError(null);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex min-w-0 flex-col gap-3" aria-describedby="place-choices-hint">
        <legend className="mb-1 text-[15px] font-medium">Is one of these your business?</legend>
        <p id="place-choices-hint" className="text-sm text-muted-foreground">
          We searched Google for {searched}. Pick yours to fill in its details, or choose None of these to keep what you typed.
        </p>
        <div className="rounded-md border border-border bg-surface">
          <ul className="divide-y divide-border" data-testid="place-choices">
            {choices.map((c) => (
              <li key={c.placeId}>
                <Option value={c.placeId} chosen={chosen} onSelect={select}>
                  <span className="block text-sm font-medium break-words">{c.name}</span>
                  {c.address ? <span className="block text-[13px] break-words text-muted-foreground">{c.address}</span> : null}
                </Option>
              </li>
            ))}
          </ul>
          <GoogleAttribution what="Listings" className="border-t border-border px-4 py-2" />
          <div className="border-t border-border">
            <Option value={NONE} chosen={chosen} onSelect={select}>
              <span className="block text-sm">{"None of these, I'll fill it in myself"}</span>
            </Option>
          </div>
        </div>
      </fieldset>

      <StepError message={error} />
      <StepActions onBack={onBack} pending={pending} />
    </form>
  );
}

function Option({ value, chosen, onSelect, children }: {
  value: string;
  chosen: string | null;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 has-checked:bg-primary-tint">
      <input
        type="radio"
        name="business-listing"
        value={value}
        checked={chosen === value}
        onChange={() => onSelect(value)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
