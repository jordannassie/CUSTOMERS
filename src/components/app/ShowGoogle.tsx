import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Show Google details" (2026-10-27): Google's ratings, reviews and hours are asked for only when the owner presses
 * this, for that one view, since Google allows no keeping of them (D-73) and every lookup counts against the quota.
 * The link adds ?google=1, so the page asks Google once and shows the values.
 */
export function ShowGoogle({ href, text, testId = "show-google" }: { href: string; text: string; testId?: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between" data-testid={testId}>
      <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 size-4 shrink-0 text-text-hint" aria-hidden="true" />
        {text}
      </p>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link href={href} scroll={false} data-testid={`${testId}-button`}>
          Show Google details
        </Link>
      </Button>
    </div>
  );
}
