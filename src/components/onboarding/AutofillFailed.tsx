"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Neither the website nor Google answered (2026-10-16, bennucoffee.com): the reason, "Try again" (auto-fill once more,
 * no new business) and a way on to fill in the form by hand. The details step shows it above the form, with no
 * "Fill in the details" (onFill left out), when the stored auto-fill failed (O1).
 */
export function AutofillFailed({ note, pending, onRetry, onFill }: { note: string; pending: boolean; onRetry: () => void; onFill?: () => void }) {
  return (
    <div className="flex flex-col gap-5" data-testid="autofill-failed">
      <p role="status" className="rounded-[14px] border border-rival/30 bg-rival-tint px-4 py-3 text-sm text-rival-ink">
        {note}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onRetry} disabled={pending}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
          Try again
        </Button>
        {onFill ? (
          <Button type="button" variant="ghost" onClick={onFill} disabled={pending}>
            Fill in the details
          </Button>
        ) : null}
      </div>
    </div>
  );
}
