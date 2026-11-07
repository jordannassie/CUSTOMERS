import Link from "next/link";
import { cn } from "cn";

// Check-in: the wordmark in Plus Jakarta Sans, the same as the app's sidebar. `preload` stays so callers need no change
// (the old logo image used it); a text wordmark has nothing to preload.
export function Logo({ className }: { className?: string; preload?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Customers.Direct home"
      className={cn("inline-flex shrink-0 rounded-md font-display font-semibold text-xl leading-none whitespace-nowrap text-foreground", className)}
    >
      Customers.Direct
    </Link>
  );
}
