"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import type { PlanChangeResult } from "@/modules/billing";

export type ChangeAction = (input: unknown) => Promise<PlanChangeResult>;

type Preview = { headline: string; details: string[]; previewedAt: number };

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

// Every plan change is two steps (D-57): the action first returns the price effect, then applies it with that
// preview's previewedAt, so the amount charged is the amount shown here.
export function ChangeDialog({ label, title, confirmLabel, action, input = {}, variant = "outline", tone, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function loadPreview() {
    setPreview(null);
    setError(null);
    startLoading(async () => {
      const result = await action(input);
      if (!result.ok) return setError(result.error);
      if (result.data.step === "preview") setPreview(result.data);
    });
  }

  function confirm() {
    if (!preview) return;
    setError(null);
    startSaving(async () => {
      const result = await action({ ...input, previewedAt: preview.previewedAt });
      if (!result.ok) {
        // Nothing changed; "Try again" fetches a fresh price before another confirm.
        setPreview(null);
        return setError(result.error);
      }
      if (result.data.step === "done") {
        toast.success(result.data.message);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant}
        className={className}
        onClick={() => {
          setOpen(true);
          loadPreview();
        }}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="sm:max-w-md" data-testid="change-dialog">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">What this change costs and when it happens.</DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Go back
              </Button>
            </DialogClose>
            {error && !preview && !loading ? (
              <Button type="button" onClick={loadPreview}>
                Try again
              </Button>
            ) : (
              <Button
                type="button"
                variant={tone === "danger" ? "destructive" : "default"}
                disabled={!preview || saving}
                onClick={confirm}
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
