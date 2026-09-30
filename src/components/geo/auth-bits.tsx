import Link from "next/link";
import Image from "next/image";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOGO = "/images/logos/logo-black.png";

export function AuthLogo() {
  return (
    <div className="mb-8 text-center">
      <Link href="/" aria-label="Customers.Direct home" className="inline-block rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <Image src={LOGO} alt="Customers.Direct" width={148} height={36} priority unoptimized className="mx-auto h-14 w-auto" />
      </Link>
    </div>
  );
}

export function AuthCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-md border border-border bg-surface", className)}>{children}</div>;
}

type FieldProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  /** Shown under the field and tied to it. */
  error?: string | null;
  /** Marks the field invalid when the error is shown elsewhere, such as a form alert. */
  invalid?: boolean;
  /** Extra element on the label row, such as a "Forgot password?" link. */
  aside?: React.ReactNode;
};

export function AuthField({ id, label, hint, error, invalid, aside, "aria-describedby": describedBy, ...input }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  // The error repeats the rule, so the hint steps aside while it shows.
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const ids = [errorId, hintId, describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <Input id={id} aria-invalid={error || invalid ? true : undefined} aria-describedby={ids} className="h-11 text-base" {...input} />
      {error ? (
        <p id={errorId} className="text-[13px] text-low-text">
          {error}
        </p>
      ) : null}
      {hintId ? (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthAlert({ id, tone, children }: { id?: string; tone: "error" | "success" | "warning"; children: React.ReactNode }) {
  const styles = { error: "bg-low-bg text-low-text", success: "bg-good-bg text-good-text", warning: "bg-mid-bg text-mid-text" }[tone];
  return (
    <div id={id} role={tone === "success" ? "status" : "alert"} className={cn("rounded-md px-3 py-2 text-[13px]", styles)}>
      {children}
    </div>
  );
}

export const authLinkClass =
  "rounded-sm text-[13px] text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
