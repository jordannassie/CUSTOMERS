"use client";

import { useCallback } from "react";
import { CheckoutForm } from "@/app/(app)/_stripe/checkout-form";
import { FormError, PayButton } from "@/app/(app)/_stripe/form-bits";
import type { StartAction } from "./choose-plan";

type Props = { publishableKey: string; planId: string; label: string; start: StartAction; onAccepted: () => void };

export default function StripePlanForm({ publishableKey, planId, label, start, onAccepted }: Props) {
  const create = useCallback(() => start({ planId }), [start, planId]);
  return (
    <CheckoutForm
      publishableKey={publishableKey}
      sessionKey={`plan:${planId}`}
      create={create}
      ErrorView={FormError}
      withAddress
      className="flex flex-col gap-5"
      actions={(pending) => <PayButton label={label} pending={pending} />}
      onConfirmed={onAccepted}
    />
  );
}
