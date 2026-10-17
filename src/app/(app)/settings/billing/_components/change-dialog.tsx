"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlanChange, type ChangeAction, type Preview } from "./use-plan-change";

export type { ChangeAction } from "./use-plan-change";

type Props = {
  label: string;
  title: string;
  confirmLabel: string;
  action: ChangeAction;
  input?: Record<string, unknown>;
  variant?: "default" | "outline" | "ghost";
  tone?: "danger";
  className?: string;
};

// A plan change with its price effect shown before it is applied (D-57). Cancelling and removing a business use
// CancelDialog instead, which also says what stops.
export function ChangeDialog({ label, title, confirmLabel, action, input = {}, variant = "outline", tone, className }: Props) {
  const change = usePlanChange(action, input);
  const { preview, error, loading, saving } = change;

  return (
    <>
      <Button type="button" size="sm" variant={variant} className={className} onClick={change.start}>
        {label}
      </Button>
      <Dialog open={change.open} onOpenChange={change.setOpen}>
        <DialogContent className="sm:max-w-md" data-testid="change-dialog" role={tone === "danger" ? "alertdialog" : "dialog"}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">What this change costs and when it happens.</DialogDescription>
          </DialogHeader>

          <PreviewBody preview={preview} loading={loading} error={error?.message ?? null} />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Go back
              </Button>
            </DialogClose>
            {error && !preview && !loading ? (
              error.retry && (
                <Button type="button" onClick={change.loadPreview}>
                  Try again
                </Button>
              )
            ) : (
              <Button
                type="button"
                variant={tone === "danger" ? "destructive" : "default"}
                disabled={!preview || saving}
                onClick={() => change.confirm()}
              >
                {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                {confirmLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The loading line, the preview's sentences and any error, shared by both dialogs. */
export function PreviewBody({ preview, loading, error }: { preview: Preview | null; loading: boolean; error: string | null }) {
  return (
    <>
      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking the price…
        </p>
      )}
      {preview && (
        <div data-testid="change-preview">
          <p className="text-[15px] font-semibold leading-snug">{preview.headline}</p>
          {preview.details.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              {preview.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-low/30 bg-low-bg px-3 py-2 text-sm text-low-text">
          {error}
        </p>
      )}
    </>
  );
}
