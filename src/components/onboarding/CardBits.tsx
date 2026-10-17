"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import { LocalDate } from "@/components/ui/local-date";
import { formatUsd } from "@/modules/billing/format";
import { StepError } from "./StepBits";

export type CardOffer = { planName: string; priceCents: number; trialEndsAt: string };

/** MVP_SPEC 3.1 step 8 and B-41: the exact price and the date the first charge happens. */
export function TrialSummary({ offer }: { offer: CardOffer }) {
  const price = formatUsd(offer.priceCents);
  return (
    <section aria-label="Your trial" className="rounded-md border border-border bg-muted p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">
          {offer.planName} plan, 1 business{" "}
          {/* The plan is picked on the step before (BUG-244). */}
          <Link href="/onboarding/models" className="ml-1 text-[13px] font-medium text-primary underline-offset-2 hover:underline">
            Change plan
          </Link>
        </p>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">$0</span> <span className="text-muted-foreground">today</span>
        </p>
      </div>
      <p data-testid="trial-terms" className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        7 days free, then {price} per business per month. Cancel anytime before <LocalDate iso={offer.trialEndsAt} /> and
        you won&apos;t be charged.
      </p>
      <ul data-testid="renewal-terms" className="mt-3 flex list-disc flex-col gap-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
        <li>After the trial, your plan renews every month on the same date until you cancel.</li>
        <li>Cancel online anytime in Settings, under Billing. Plans are not refunded once charged.</li>
      </ul>
      <p className="mt-3 text-[13px]">
        <Link href="/terms#trial" target="_blank" rel="noopener" className="font-medium text-primary underline-offset-2 hover:underline">
          Read the trial and billing terms<span className="sr-only"> (opens in a new tab)</span>
        </Link>
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
// Linking and the trial credits take a few seconds; after this the screen stops spinning and says what to do.
export const STILL_SETTING_UP_MS = 30_000;

/**
 * Shown after the card is accepted, until the subscription is linked and the trial credits are in (B-42, A1).
 * Nothing is granted or marked paid here; the server only reports whether the account is ready. The next page opens
 * with a full page load: an in-app navigation could change the URL and leave this screen showing (A2).
 */
export function SettingUp({ businessId, check }: {
  businessId: string;
  check: (input: { businessId: string }) => Promise<ActionResult<{ done: boolean; next: string }>>;
}) {
  const [late, setLate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    async function poll() {
      const result = await check({ businessId }).catch(() => null);
      if (stopped) return;
      if (result?.ok && result.data.done) {
        stopped = true;
        return window.location.assign(result.data.next);
      }
      if (result && !result.ok) setError(result.error);
      if (Date.now() - started > STILL_SETTING_UP_MS) setLate(true);
      timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [businessId, check]);

  if (late) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6">
        <p className="text-base font-medium">Still setting up your account</p>
        <p className="text-[13px] text-muted-foreground">
          Your card was accepted, and your trial is taking longer than usual to start. Refresh this page in a minute, or{" "}
          <Link href="/contact" className="font-medium text-primary underline-offset-2 hover:underline">
            contact us
          </Link>
          .
        </p>
        <StepError message={error} />
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6">
      <Loader2 aria-hidden className="size-5 animate-spin text-primary" />
      <p className="text-base font-medium">Setting up your account…</p>
      <p className="text-[13px] text-muted-foreground">Your card was accepted. We&apos;re starting your free trial, which takes a few seconds.</p>
      <StepError message={error} />
    </div>
  );
}
