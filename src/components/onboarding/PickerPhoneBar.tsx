"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The competitor picker's bar on a phone, where the list sits below the fold: Back (in the wizard), the count, the
 * plan limit note and Save stay in reach. The wizard's Back sits under the list on a desktop (2026-10-16).
 */
export function PickerPhoneBar({
  backHref,
  count,
  limitNote,
  canSave,
  pending,
  saveLabel,
  onSave,
}: {
  backHref?: string;
  count: string;
  limitNote: string | null;
  canSave: boolean;
  pending: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-5 py-3 lg:hidden">
      {limitNote ? (
        <p aria-hidden className="mb-2 rounded-md bg-mid-bg px-3 py-2 text-[13px] text-mid-text">
          {limitNote}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          {backHref ? (
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href={backHref}>
                <ArrowLeft aria-hidden />
                Back
              </Link>
            </Button>
          ) : null}
          <span className="truncate text-[13px] tabular-nums text-muted-foreground">{count}</span>
        </div>
        <Button type="button" disabled={!canSave} onClick={onSave} className="shrink-0">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
