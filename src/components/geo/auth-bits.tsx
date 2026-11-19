import Link from "next/link";
import Image from "next/image";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOGO = "/images/logos/logo-black-sidebar.png";

export function AuthLogo() {
  return (
    <div className="mb-8 text-center">
      {/* No prefetch: every login and signup view rendered the whole home page on the server, often twice. */}
      <Link href="/" prefetch={false} aria-label="Customers.Direct home" className="inline-block rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <Image src={LOGO} alt="Customers.Direct" width={640} height={89} preload unoptimized className="mx-auto h-6 w-auto" />
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
  /** Under the field, after the hint or error: the password checklist. */
  below?: React.ReactNode;
};

export function AuthField({ id, label, hint, error, invalid, aside, below, "aria-describedby": describedBy, ...input }: FieldProps) {
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
        <p id={errorId} className="text-[length:calc(13px*var(--px,1))] text-low-text">
          {error}
        </p>
      ) : null}
      {hintId ? (
        <p id={hintId} className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {below}
    </div>
  );
}

export function AuthAlert({ id, tone, children }: { id?: string; tone: "error" | "success" | "warning"; children: React.ReactNode }) {
  const styles = { error: "bg-low-bg text-low-text", success: "bg-good-bg text-good-text", warning: "bg-mid-bg text-mid-text" }[tone];
  return (
    <div id={id} role={tone === "success" ? "status" : "alert"} className={cn("rounded-md px-3 py-2 text-[length:calc(13px*var(--px,1))]", styles)}>
      {children}
    </div>
  );
}

export const authLinkClass =
  "rounded-sm text-[length:calc(13px*var(--px,1))] text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.5 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);
