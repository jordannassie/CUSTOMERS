"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StatusAction } from "./choose-plan";

const POLL_MS = 1500;
// About a minute; Stripe's webhook normally lands within a few seconds.
const MAX_POLLS = 40;

type State = "waiting" | "started" | "slow";

// After the card is accepted, the plan starts through Stripe's webhook, never from this page. It only watches.
export function PlanProgress({ status }: { status: StatusAction }) {
  const router = useRouter();
  const [state, setState] = useState<State>("waiting");

  useEffect(() => {
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function poll() {
      const result = await status().catch(() => null);
      if (stopped) return;
      if (result?.ok && result.data.started) {
        setState("started");
        // Updates the sidebar balance and banners.
        router.refresh();
        return;
      }
      if (++polls >= MAX_POLLS) return setState("slow");
      timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [status, router]);

  if (state === "waiting") {
    return (
      <p role="status" data-testid="plan-waiting" className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Card accepted. Setting up your plan…
      </p>
    );
  }
  if (state === "slow") {
    return (
      <p role="status" data-testid="plan-slow" className="rounded-md border border-mid/30 bg-mid-bg px-4 py-3 text-sm text-mid-text">
        Your card was accepted, but your plan is taking longer than usual to start. Refresh this page in a minute. If it
        still hasn&apos;t started, contact us and we&apos;ll sort it out.
      </p>
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
