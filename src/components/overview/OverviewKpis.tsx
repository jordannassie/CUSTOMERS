import Link from "next/link";
import { cn } from "cn";
import type { SourcesPage } from "@/modules/sources";
import type { SourceLine } from "./OverviewCards";

// The Overview's range control and its "Where AI gets its answers" lines (dashboard redesign, 2026-10-27).

export const RANGES = [7, 30, 90] as const;


export function sourceLines(sources: SourcesPage | null): SourceLine[] {
  if (!sources) return [];
  const own = sources.ownSite.host;
  const lines: SourceLine[] = sources.sites
    .filter((s) => s.mentions !== "own")
    .slice(0, own && sources.ownSite.answers === 0 ? 4 : 5)
    .map((s) => ({ host: s.host, answers: s.answers, status: s.mentions === "always" ? "named" : s.mentions === "sometimes" ? "partly" : "missing" }));
  if (own && sources.ownSite.answers === 0) lines.push({ host: own, answers: 0, status: "never" });
  return lines;
}

export function RangeControl({ days }: { days: number }) {
  return (
    <div className="inline-flex h-9 overflow-hidden rounded-md border border-border" role="group" aria-label="Date range" data-testid="range">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={r === 30 ? "/dashboard" : `/dashboard?range=${r}`}
          aria-current={r === days ? "true" : undefined}
          className={cn("flex items-center px-3 text-[13px] font-medium", r === days ? "bg-foreground text-background" : "bg-surface hover:bg-muted")}
        >
          {r} days
        </Link>
      ))}
    </div>
  );
}


