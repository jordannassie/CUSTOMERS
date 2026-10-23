"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import { formatCount, formatUsd } from "@/modules/billing/format";
import { planMoves } from "@/modules/billing/plan-change/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type SetupPlanChoice = {
  id: string;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  maxCompetitors: number | null;
};

type Props = {
  businessId: string;
  plans: SetupPlanChoice[];
  currentId: string;
  /** What finishing adds to the bill, or what the trial costs after it ends. */
  note: string | null;
  choose: (input: { businessId: string; planId: string }) => Promise<ActionResult<{ planId: string }>>;
};

// BUG-244: an agency picks the plan for each business while setting it up, not only later on Billing. The buttons
// follow Billing's words (planMoves); the server then prices the business on the new plan the way Billing's "Add on"
// does (D-57), so what this step says is what finishing charges.
export function SetupPlan({ businessId, plans, currentId, note, choose }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = plans.find((p) => p.id === currentId);
  if (!current) return null;

  function move(planId: string) {
    setError(null);
    setTarget(planId);
    startTransition(async () => {
      const result = await choose({ businessId, planId }).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "We couldn't change the plan. Check your connection and try again.");
      // The plan, the price and the estimate all come from the server again.
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="setup-plan-heading" data-testid="setup-plan" className="rounded-md border border-border bg-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 id="setup-plan-heading" className="text-base font-semibold tracking-[-0.02em]">
            Plan for this business
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="tint" data-testid="setup-plan-name">
              {current.name}
            </Badge>
            <span className="text-sm tabular-nums">{formatUsd(current.priceCents)} a month</span>
          </p>
          <p className="mt-3 text-[13px] text-muted-foreground">
            {formatCount(current.monthlyCredits)} credits a month
            {current.maxCompetitors ? `, up to ${current.maxCompetitors} competitors` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {planMoves(current.id, plans).map(({ plan, move: kind, label }) => (
            <Button key={plan.id} type="button" size="sm" variant={kind === "upgrade" ? "default" : "outline"} disabled={pending} onClick={() => move(plan.id)}>
              {pending && target === plan.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {label}
            </Button>
          ))}
        </div>
      </div>
      {note ? (
        <p data-testid="add-on-note" className="mt-3 border-t border-border pt-3 text-sm">
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
          {error}
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {pending ? "Changing the plan" : `This business is on ${current.name}.`}
      </p>
    </section>
  );
}
