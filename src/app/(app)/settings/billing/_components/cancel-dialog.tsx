"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PreviewBody } from "./change-dialog";
import { usePlanChange, type ChangeAction } from "./use-plan-change";

// The values match CANCEL_REASONS in the billing module (migration 062).
const REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_useful", label: "Not useful enough" },
  { value: "just_testing", label: "Just testing" },
  { value: "other", label: "Other" },
];

type Props = {
  /** The button on the page: "Cancel plan" or "Remove". */
  label: string;
  title: string;
  keepLabel: string;
  confirmLabel: string;
  reasonLabel: string;
  action: ChangeAction;
  input?: Record<string, unknown>;
  variant?: "outline" | "ghost";
  className?: string;
};

// "Before you cancel": cancelling the plan or taking one business off it. The sentences come from the server's
// preview (copy.ts), with the account's real dates and credits, and say only what the app does. Keeping is the
// main button; nothing changes until "Cancel anyway".
export function CancelDialog({ label, title, keepLabel, confirmLabel, reasonLabel, action, input = {}, variant = "outline", className }: Props) {
  const change = usePlanChange(action, input);
  const { preview, error, loading, saving } = change;
  const [reason, setReason] = useState("");

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant}
        className={className}
        onClick={() => {
          setReason("");
          change.start();
        }}
      >
        {label}
      </Button>
      <Dialog open={change.open} onOpenChange={change.setOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="cancel-dialog" role="alertdialog">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">What stops, what stays, and when.</DialogDescription>
          </DialogHeader>

          <PreviewBody preview={preview} loading={loading} error={error?.message ?? null} />

          {preview?.losses && (
            <div className="rounded-md border border-border bg-muted/50 px-4 py-3" data-testid="cancel-losses">
              <p className="text-sm font-medium">{preview.losses.heading}</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {preview.losses.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {preview && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancel-reason">{reasonLabel}</Label>
              <Select
                id="cancel-reason"
                value={reason}
                onValueChange={setReason}
                options={REASONS}
                placeholder="Choose a reason"
                className="h-9"
              />
            </div>
          )}

          <DialogFooter>
            {error && !preview && !loading ? (
              error.retry && (
                <Button type="button" variant="outline" onClick={change.loadPreview}>
                  Try again
                </Button>
              )
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={!preview || saving}
                onClick={() => change.confirm(reason ? { reason } : {})}
              >
                {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                {confirmLabel}
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" disabled={saving}>
                {keepLabel}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
