"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { credits } from "@/components/usage/format";
import type { StatusAction } from "./topup-checkout";

const POLL_MS = 1500;
// About a minute; Stripe's webhook normally lands within a few seconds.
const MAX_POLLS = 40;

type State = { kind: "waiting" } | { kind: "done"; added: number; balance: number } | { kind: "slow" };

// After paying, credits arrive through Stripe's webhook, never from this page. It only watches for them.
export function TopupProgress({ sessionId, status }: { sessionId: string; status: StatusAction }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "waiting" });

  useEffect(() => {
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function poll() {
      const result = await status({ sessionId }).catch(() => null);
      if (stopped) return;
      if (result?.ok && result.data.credited !== null) {
        setState({ kind: "done", added: result.data.credited, balance: result.data.balance });
        // Updates the sidebar balance and banners.
        router.refresh();
        return;
      }
      if (++polls >= MAX_POLLS) return setState({ kind: "slow" });
      timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessionId, status, router]);

  if (state.kind === "waiting") {
    return (
      <p role="status" data-testid="topup-waiting" className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Payment received. Adding your credits…
      </p>
    );
  }
  if (state.kind === "slow") {
    return (
      <p role="status" data-testid="topup-slow" className="rounded-md border border-mid/30 bg-mid-bg px-4 py-3 text-sm text-mid-text">
        Your payment went through, but your credits are taking longer than usual. They will show up on their own. Refresh
        this page in a minute to check.
      </p>
    );
  }
  return (
    <div role="status" data-testid="topup-done" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5">
      <p className="flex items-start gap-2 text-[15px] font-medium">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good" aria-hidden="true" />
        {credits(state.added)} added.
      </p>
      <p className="text-sm text-muted-foreground">
        {state.balance < 0 ? (
          <>They paid back what you used past zero. You&apos;re still {credits(-state.balance)} over.</>
        ) : (
          <>
            You now have <span data-testid="topup-balance" className="font-semibold text-foreground tabular-nums">{credits(state.balance)}</span>.
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/settings/usage">See usage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
