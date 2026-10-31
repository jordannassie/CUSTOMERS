"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatCount, formatUsd, type PublicPlan } from "@/modules/billing/format";
import type { PlanNowView } from "@/modules/billing";
import { PlanNow, type PlanNowStatusAction, type StartPlanNowAction } from "./plan-now";

/** Set only when the trial's business limit is what blocks setup (D-16): the trial can then end today. */
export type PlanNowProps = { view: PlanNowView; start: StartPlanNowAction; status: PlanNowStatusAction; trialBusinesses: number };

type Props = {
  plans: PublicPlan[];
  nextHref: string;
  /** Why setup can't start now (trial limit, past due...); the plans still show, with the way out instead of Continue. */
  blockedReason: string | null;
  planNow: PlanNowProps | null;
  backHref: string;
};

// Cards styled like the signup Choose plan page, but with no payment: the price is charged through the
// existing subscription once the business is set up (D-57), the same as "Set up another business" today.
export function NewBusinessPlanPicker({ plans, nextHref, blockedReason, planNow, backHref }: Props) {
  const router = useRouter();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="sr-only">Plans</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <label
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-md border bg-surface p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                p.id === planId ? "border-primary bg-primary-tint" : "border-border hover:border-primary/40",
              )}
            >
              <input type="radio" name="plan" value={p.id} checked={p.id === planId} onChange={() => setPlanId(p.id)} className="sr-only" />
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
      {planNow ? (
        <PlanNow {...planNow} continueHref={continueHref(nextHref, planId)} backHref={backHref} />
      ) : blockedReason ? (
        // Past due, ended or paused: Billing is where each of those is fixed.
        <div className="flex flex-col gap-4">
          <p role="status" data-testid="blocked" className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
            {blockedReason}
          </p>
          <div>
            <Button asChild>
              <Link href={backHref}>Go to Billing</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!planId} onClick={() => router.push(continueHref(nextHref, planId))}>
            Continue
          </Button>
          <Button asChild variant="ghost">
            <Link href={backHref}>Back to Billing</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

const continueHref = (nextHref: string, planId: string) => `${nextHref}?plan=${encodeURIComponent(planId)}`;

function limits(p: PublicPlan): string[] {
  return [
    `${formatCount(p.monthlyCredits)} credits each month`,
    ...(p.maxCompetitors ? [`Up to ${p.maxCompetitors} competitors`] : []),
    ...(p.maxQuestions ? [`Up to ${p.maxQuestions} questions`] : []),
  ];
}
