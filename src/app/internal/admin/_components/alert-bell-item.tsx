"use client";

import { useId, useState, useTransition } from "react";
import { Activity, Bell, Bot, CreditCard, Gauge, ScanSearch, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Resolve } from "../_overview/open-alerts";

// One icon per kind of problem, so the list reads at a glance.
const ICONS: [RegExp, LucideIcon][] = [
  [/^webhook_|^paid_not_active|^schedule_lost|^topup_refund|stripe/, CreditCard],
  [/^anthropic_|^ai_fallback|^claude_|^provider_errors|openai|perplexity|anthropic/, Bot],
  [/^failed_scans|^stuck_jobs/, ScanSearch],
  [/^negative_balances/, Wallet],
  [/^daily_ai_cost/, Gauge],
  [/^service_check/, Activity],
];
export const iconFor = (kind: string): LucideIcon => ICONS.find(([re]) => re.test(kind))?.[1] ?? Bell;

/** Resolve on an open alert, right in the bell's box: asks what was done, saved in the audit log. */
export function ResolveAction({ alertId, run }: { alertId: string; run: Resolve }) {
  const [resolving, setResolving] = useState(false);
  if (!resolving) {
    return (
      <button type="button" className="rounded-sm font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => setResolving(true)}>
        Resolve
      </button>
    );
  }
  return <ResolveForm alertId={alertId} run={run} onCancel={() => setResolving(false)} />;
}

/** What the admin did about it, saved in the audit log; the page refreshes and the alert moves to Resolved. */
function ResolveForm({ alertId, run, onCancel }: { alertId: string; run: Resolve; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (reason.length < 3) return setError("Say what you did, in at least 3 characters.");
    setError(null);
    startTransition(async () => {
      const result = await run({ alertId, reason });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form noValidate onSubmit={submit} className="mt-1 flex w-full flex-col gap-2">
      <label htmlFor={id} className="font-medium text-foreground">
        What did you do about it?
      </label>
      <Textarea id={id} name="reason" rows={2} maxLength={500} placeholder="Saved in the audit log with your name" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="min-h-14 text-[length:calc(12.5px*var(--px,1))]" />
      {error && (
        <p id={`${id}-error`} className="text-low-text">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="xs" disabled={pending}>
          {pending ? "Resolving…" : "Resolve alert"}
        </Button>
        <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
