import Link from "next/link";
import { cn } from "cn";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-errors";
import { Label } from "@/components/ui/label";
import { BackIcon } from "./LinkPending";

export function StepError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
      {message}
    </p>
  );
}

/**
 * Back and Continue. On a phone the bar sticks to the bottom so Continue stays in reach. Every step lays its parts out
 * 24px apart (gap-6); the extra 8px here puts the buttons 32px under the content on every step.
 */
export function StepActions({ backHref, onBack, pending, label = "Continue", disabled = false, phoneSummary }: {
  backHref?: string;
  /** Back within the step (no page change), used when there is no backHref. */
  onBack?: () => void;
  pending: boolean;
  label?: string;
  disabled?: boolean;
  /** Shown in place of Back on a phone, where the step's key number would be off screen. */
  phoneSummary?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      {phoneSummary ? <div className="min-w-0 sm:hidden">{phoneSummary}</div> : null}
      {backHref ? (
        // sm:-ml-4: the arrow lines up with the step's left edge instead of sitting inside the button's padding.
        <Button asChild variant="ghost" className={cn("sm:-ml-4", phoneSummary && "max-sm:hidden")}>
          {/* Setup pages can't be prefetched (instant = false): a prefetch only got a 404. */}
          <Link href={backHref} prefetch={false}>
            <BackIcon />
            Back
          </Link>
        </Button>
      ) : onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending} className={cn("sm:-ml-4", phoneSummary && "max-sm:hidden")}>
          <ArrowLeft aria-hidden />
          Back
        </Button>
      ) : phoneSummary ? null : (
        <span />
      )}
      <Button type="submit" disabled={pending || disabled} className="min-w-32">
        {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}

export function FieldHint({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-[13px] text-muted-foreground">
      {children}
    </p>
  );
}

/** A labelled form field with its error and hint, as the details step lays them out. */
export function Field({ id, label, optional, hint, error, errorId, className, children }: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children}
      {errorId ? <FieldMessage id={errorId} message={error} /> : null}
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
    </div>
  );
}
