"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Neither the website nor Google answered (2026-10-16, bennucoffee.com): the reason, "Try again" (auto-fill once more,
 * no new business) and a way on to fill in the form by hand.
 */
export function AutofillFailed({ note, pending, onRetry, onFill }: { note: string; pending: boolean; onRetry: () => void; onFill: () => void }) {
  return (
    <div className="flex flex-col gap-5" data-testid="autofill-failed">
      <p role="status" className="rounded-md border border-mid/30 bg-mid-bg px-4 py-3 text-sm text-mid-text">
        {note}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onRetry} disabled={pending}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
          Try again
        </Button>
        <Button type="button" variant="ghost" onClick={onFill} disabled={pending}>
          Fill in the details
        </Button>
      </div>
    </div>
  );
}
