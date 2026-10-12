"use client";

import { useTimeZone } from "@/components/ui/local-date";
import { useState } from "react";
import dynamic from "next/dynamic";
import { StripeFormLoading } from "@/app/(app)/_stripe/form-loading";
import { Check } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import { formatCount, formatUsd } from "@/modules/billing/format";
import type { CardFormMode, ChoosePlanState } from "@/modules/billing";
import { FixturePlanForm } from "./fixture-plan-form";
import { PlanProgress } from "./plan-progress";

const StripePlanForm = dynamic(() => import("./stripe-plan-form"), { ssr: false, loading: StripeFormLoading });

export type StartAction = (input: { planId: string }) => Promise<ActionResult<{ clientSecret: string }>>;
export type StatusAction = () => Promise<ActionResult<{ started: boolean }>>;

type Choose = Extract<ChoosePlanState, { kind: "choose" }>;

type Props = {
  state: Choose;
  mode: CardFormMode;
  publishableKey: string | null;
  initialPlanId: string | null;
  returned: boolean;
  start: StartAction;
  status: StatusAction;
};

const TRIAL_DAYS = 7;

// Pick a plan, pay on this page, then wait for Stripe's webhook to start it (BUG-079, BUG-066).
export function ChoosePlan({ state, mode, publishableKey, initialPlanId, returned, start, status }: Props) {
  const first = state.plans.find((p) => p.id === initialPlanId) ?? state.plans[0];
  const [planId, setPlanId] = useState(first?.id ?? "");
  const [paying, setPaying] = useState(false);
  const [accepted, setAccepted] = useState(returned);
  const timeZone = useTimeZone();
  const plan = state.plans.find((p) => p.id === planId) ?? first;

  if (accepted) return <PlanProgress status={status} />;
  if (!plan) return <Unavailable text="No plans are on sale right now. Please check back later." />;

  const monthly = plan.priceCents * state.businessCount;
  const terms = termsText(state, monthly, timeZone);
  const label = state.trial ? "Start free trial" : `Pay ${formatUsd(monthly)}`;

  if (!paying) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPaying(true);
        }}
        className="flex flex-col gap-5"
      >
        {state.ended && (
          <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm" data-testid="plan-ended">
            Your plan has ended. Your results are still here, and choosing a plan starts your scans again.
          </p>
        )}
        <fieldset>
          <legend className="sr-only">Plans</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {state.plans.map((p) => (
              <label
                key={p.id}
                data-testid={`plan-${p.id}`}
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-md border bg-surface p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  p.id === plan.id ? "border-primary bg-primary-tint" : "border-border hover:border-primary/40",
                )}
              >
                <input type="radio" name="plan" value={p.id} checked={p.id === plan.id} onChange={() => setPlanId(p.id)} className="sr-only" />
                <span className="text-base font-semibold">{p.name}</span>
                <span className="text-sm">
                  <span className="text-lg font-semibold tabular-nums">{formatUsd(p.priceCents)}</span> per business a month
                </span>
                <ul className="mt-1 flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {limits(p).map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="tabular-nums">{line}</span>
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-sm" data-testid="plan-terms">
          {terms}
        </p>
        {mode === "off" ? (
          <Unavailable text="Choosing a plan isn't available right now. Please try again later." />
        ) : (
          <Button type="submit" className="self-start">
            Continue to payment
          </Button>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <span data-testid="chosen-plan">
          <span className="font-semibold">{plan.name}</span> for {businesses(state.businessCount)}, {formatUsd(monthly)} a month
        </span>
        <Button type="button" variant="link" size="sm" onClick={() => setPaying(false)}>
          Change
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{terms}</p>
      {mode === "fixture" ? (
        <FixturePlanForm planId={plan.id} label={label} start={start} onAccepted={() => setAccepted(true)} />
      ) : publishableKey ? (
        <StripePlanForm key={plan.id} publishableKey={publishableKey} planId={plan.id} label={label} start={start} onAccepted={() => setAccepted(true)} />
      ) : null}
      <p className="text-xs text-muted-foreground">Payments are handled by Stripe. We never see or store your card number.</p>
    </div>
  );
}

function businesses(count: number): string {
  return count === 1 ? "1 business" : `${count} businesses`;
}

function termsText(state: Choose, monthly: number, timeZone: string): string {
  const total = `${formatUsd(monthly)} a month for ${businesses(state.businessCount)}`;
  if (!state.trial) return `You pay ${total} today, then on the same date each month until you cancel.`;
  // The viewer's own time zone, like Billing and the card step.
  const ends = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone });
  return `${TRIAL_DAYS} days free, then ${total}. Cancel before ${ends} and you won't be charged.`;
}

function limits(p: Choose["plans"][number]): string[] {
  return [
    `${formatCount(p.monthlyCredits)} credits each month`,
    ...(p.maxCompetitors ? [`Up to ${p.maxCompetitors} competitors`] : []),
    ...(p.maxQuestions ? [`Up to ${p.maxQuestions} questions`] : []),
  ];
}

function Unavailable({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
      {text}
    </p>
  );
}
