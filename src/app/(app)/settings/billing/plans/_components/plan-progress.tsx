"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StatusAction } from "./choose-plan";
import { usePlanStatus } from "./use-plan-status";

// After the card is accepted, each check reads the plan back from Stripe and starts it here too if the webhook is
// late (A1, 2026-10-15). After 30 seconds the user can check again instead of waiting for good.
export function PlanProgress({ status }: { status: StatusAction }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const onStarted = useCallback(() => {
    setStarted(true);
    // Updates the sidebar balance and banners.
    router.refresh();
  }, [router]);
  const { slow, checking, checkAgain } = usePlanStatus(status, !started, onStarted);

  if (!started && !slow) {
    return (
      <p role="status" data-testid="plan-waiting" className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Card accepted. Setting up your plan…
      </p>
    );
  }
  if (!started) {
    return (
      <div role="status" data-testid="plan-slow" className="flex flex-col items-start gap-3 rounded-md border border-mid/30 bg-mid-bg px-4 py-3 text-sm text-mid-text">
        <p>
          Your card was accepted, but your plan is taking longer than usual to start. Check again in a moment. If it still
          hasn&apos;t started, contact us and we&apos;ll sort it out.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={checkAgain} disabled={checking}>
          {checking ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Check again
        </Button>
      </div>
    );
  }
  return (
    <section role="status" data-testid="plan-started" className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface px-5 py-5">
      <p className="flex items-center gap-2 text-base font-semibold">
        <CheckCircle2 className="size-5 text-good" aria-hidden="true" />
        Your plan has started
      </p>
      <p className="text-sm text-muted-foreground">Your credits are added and your scans run on schedule again.</p>
      <Button asChild>
        <Link href="/settings/billing">Go to billing</Link>
      </Button>
    </section>
  );
}
