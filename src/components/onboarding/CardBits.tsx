"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import { formatUsd } from "@/modules/billing/format";
import { StepError } from "./StepBits";

export type CardOffer = { planName: string; priceCents: number; trialEndsAt: string };

// The trial end in the user's own time zone, so "cancel before" is never a day later than the charge.
function LocalDate({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
    </time>
  );
}

/** MVP_SPEC 3.1 step 8 and B-41: the exact price and the date the first charge happens. */
export function TrialSummary({ offer }: { offer: CardOffer }) {
  const price = formatUsd(offer.priceCents);
  return (
    <section aria-label="Your trial" className="rounded-md border border-border bg-muted p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">{offer.planName} plan, 1 business</p>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">$0</span> <span className="text-muted-foreground">today</span>
        </p>
      </div>
      <p data-testid="trial-terms" className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        7 days free, then {price} per business per month. Cancel anytime before <LocalDate iso={offer.trialEndsAt} /> and
        you won&apos;t be charged.
      </p>
    </section>
  );
}

export function SecureNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-text-hint">
      <Lock aria-hidden className="size-3.5" />
      Card details go straight to Stripe. We never see or store your card number.
    </p>
  );
}

const POLL_MS = 2000;
const SLOW_AFTER_MS = 45_000;

/**
 * Shown after the card is accepted, until the Stripe webhook has linked the subscription (B-42).
 * Nothing is granted or marked paid here; the server only reports whether the webhook arrived.
 */
export function SettingUp({ businessId, check }: {
  businessId: string;
  check: (input: { businessId: string }) => Promise<ActionResult<{ done: boolean; next: string }>>;
}) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    async function poll() {
      const result = await check({ businessId }).catch(() => null);
      if (stopped) return;
      if (result?.ok && result.data.done) return router.replace(result.data.next);
      if (result && !result.ok) setError(result.error);
      if (Date.now() - started > SLOW_AFTER_MS) setSlow(true);
      timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [businessId, check, router]);

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6">
      <Loader2 aria-hidden className="size-5 animate-spin text-primary" />
      <p className="text-base font-medium">Setting up your account…</p>
      <p className="text-[13px] text-muted-foreground">
        {slow
          ? "This is taking longer than usual. Keep this page open, or come back in a few minutes."
          : "Your card was accepted. We're starting your free trial, which takes a few seconds."}
      </p>
      <StepError message={error} />
    </div>
  );
}
