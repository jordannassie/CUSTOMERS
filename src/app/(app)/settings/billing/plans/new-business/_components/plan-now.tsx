"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { PlanNowView } from "@/modules/billing";
import { usePlanStatus, type PlanStatusAction } from "../../_components/use-plan-status";

export type StartPlanNowAction = (input: { attemptId: string }) => Promise<ActionResult<{ alreadyActive: boolean; started: boolean }>>;
export type PlanNowStatusAction = PlanStatusAction;

type State = "idle" | "starting" | "waiting";

type Props = {
  view: PlanNowView;
  start: StartPlanNowAction;
  status: PlanNowStatusAction;
  /** Where setup goes once the plan has started, with the plan picked above. */
  continueHref: string;
  /** TRIAL_MAX_BUSINESSES (D-16). */
  trialBusinesses: number;
  backHref: string;
};

// D-16: a trial covers 2 businesses. Instead of a Continue that never turns on, the trial can end today. The plan
// starts from what Stripe says: the start action and each check read it back and apply it like the webhook (A1).
export function PlanNow({ view, start, status, continueHref, trialBusinesses, backHref }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<{ text: string; declined: boolean } | null>(null);
  // New for each try: a double click charges once, and a try after a declined card is a new request.
  const [attemptId, setAttemptId] = useState(() => crypto.randomUUID());

  const goOn = useCallback(() => router.push(continueHref), [router, continueHref]);
  const { slow, checking, checkAgain } = usePlanStatus(status, state === "waiting", goOn);

  async function onStart() {
    setState("starting");
    setError(null);
    const result = await start({ attemptId }).catch(() => null);
    if (result?.ok) return result.data.started ? goOn() : setState("waiting");
    setError({
      text: result?.error ?? "Something went wrong, so nothing was charged. Try again in a minute.",
      declined: result?.status === 402,
    });
    setAttemptId(crypto.randomUUID());
    setState("idle");
  }

  if (view.kind === "unavailable") {
    return (
      <section data-testid="plan-now" className="rounded-md border border-border bg-surface px-5 py-5">
        <p className="text-[15px] font-medium">
          Your trial includes {trialBusinesses} businesses. To add another, your paid plan needs to start.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{view.message}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={backHref}>Go to Billing</Link>
          </Button>
        </div>
      </section>
    );
  }

  const busy = state !== "idle";
  return (
    <section data-testid="plan-now" className="rounded-md border border-border bg-surface px-5 py-5">
      <h2 className="text-base font-semibold tracking-[-0.02em]">Start your plan now to add more businesses</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Your trial includes {trialBusinesses} businesses. To add another, start your paid plan today.
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {view.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="tabular-nums">{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        Next, you set up your new business on the plan you picked above. Its price is added to your plan when you
        finish setup.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-low/30 bg-low-bg px-3 py-2 text-sm text-low-text">
          {error.text}
          {error.declined && (
            <>
              {" "}
              <Link href={backHref} className="font-medium underline underline-offset-2">
                Go to Billing
              </Link>
            </>
          )}
        </p>
      )}
      {state === "waiting" && !slow && (
        <p role="status" data-testid="plan-now-waiting" className="mt-3 flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          Payment accepted. Starting your plan…
        </p>
      )}
      {state === "waiting" && slow && (
        <div role="status" data-testid="plan-now-slow" className="mt-3 flex flex-col items-start gap-3 rounded-md border border-mid/30 bg-mid-bg px-3 py-2 text-sm text-mid-text">
          <p>
            Your payment went through, but your plan is taking longer than usual to start. Check again in a moment. If it
            still hasn&apos;t started, contact us and we&apos;ll sort it out.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={checkAgain} disabled={checking}>
            {checking ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Check again
          </Button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onStart} disabled={busy}>
          {state === "starting" ? "Starting your plan…" : "Start my plan now"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={backHref}>Back to Billing</Link>
        </Button>
      </div>
    </section>
  );
}
