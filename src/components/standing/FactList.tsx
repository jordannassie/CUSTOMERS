import Link from "next/link";
import { ArrowRight, Globe, Link2, MapPin, ThumbsUp } from "lucide-react";
import { cn } from "cn";
import type { Fact, Where } from "@/modules/standing/reasons";
import { fixAnchor } from "@/lib/fix-where";
import { FIX_TEXT } from "@/modules/standing/where";

const ICON: Record<Where, typeof Globe> = { website: Globe, google_listing: MapPin, other_places: Link2 };

/**
 * Likely reasons (or your leads) as short rows: an icon for where the fix happens, a title, one line of detail and
 * the place to fix it. No hooks, so server and client screens both use it. "Fix on ..." links to that group on the
 * Opportunities page only when it has fixes to do (`openFixes`); otherwise it is plain text, so nothing looks clickable
 * that isn't.
 */
export function FactList({
  facts,
  tone = "behind",
  testId,
  className,
  openFixes = [],
}: {
  facts: Fact[];
  tone?: "behind" | "ahead";
  testId?: string;
  className?: string;
  /** The Opportunities groups with fixes to do. */
  openFixes?: Where[];
}) {
  return (
    <ul className={cn("flex flex-col gap-2", className)} data-testid={testId}>
      {facts.map((f) => {
        const Icon = tone === "ahead" ? ThumbsUp : f.where ? ICON[f.where] : Globe;
        return (
          <li key={f.text} className="flex items-start gap-3 rounded-md border border-border bg-surface p-3" data-testid="fact">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                tone === "ahead" ? "bg-good-bg text-good-text" : "bg-mid-bg text-mid-text",
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{f.title}</span>
              {f.detail && <span className="text-[13px] text-muted-foreground">{f.detail}</span>}
              {f.where && tone === "behind" &&
                (openFixes.includes(f.where) ? (
                  <Link
                    href={`/opportunities#${fixAnchor(f.where)}`}
                    className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
                    data-testid="fix-link"
                  >
                    {FIX_TEXT[f.where]}
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="mt-1 text-xs text-muted-foreground" data-testid="fix-label">
                    {FIX_TEXT[f.where]}
                  </span>
                ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
