import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
      {message}
    </p>
  );
}

/** Back and Continue. On a phone the bar sticks to the bottom so Continue stays in reach. */
export function StepActions({ backHref, pending, label = "Continue", disabled = false }: {
  backHref?: string;
  pending: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      {backHref ? (
        <Button asChild variant="ghost">
          <Link href={backHref}>
            <ArrowLeft aria-hidden />
            Back
          </Link>
        </Button>
      ) : (
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
