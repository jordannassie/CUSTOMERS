import Link from "next/link";
import { cn } from "cn";
import type { OverviewCompete } from "@/modules/competitors";
import type { SourcesPage } from "@/modules/sources";

// The Overview's range control and its "Where AI gets its answers" lines (dashboard redesign, 2026-10-27).

export const RANGES = [7, 30, 90] as const;

/** One site AI used, and whether those answers named you ("never": your own site, never cited). */
export type SourceLine = { host: string; answers: number; status: "missing" | "partly" | "named" | "never" };

/**
 * "Where AI gets its answers" from the score's own answers, counted like the report's "Where AI looks" (audit,
 * 2026-10-28): your own site is left out of the list and shown last when AI never cited it.
 */
export function standingSourceLines(sites: OverviewCompete["sites"], own: OverviewCompete["ownSite"], ownHost: string | null): SourceLine[] | null {
  if (!sites) return null;
  const uncited = !!own?.hasSite && own.cited === 0 && !!ownHost;
  const lines: SourceLine[] = sites
    .filter((s) => !s.own)
    .slice(0, uncited ? 4 : 5)
    .map((s) => ({ host: s.host, answers: s.answers, status: s.namedYou === s.answers ? "named" : s.namedYou > 0 ? "partly" : "missing" }));
  if (uncited) lines.push({ host: ownHost!, answers: 0, status: "never" });
  return lines;
}

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

/** 7, 30 or 90 days, as links (the server reads the range), as Check-in pill tabs: the range shown is brand blue. */
export function RangeControl({ days }: { days: number }) {
  return (
    <div className="inline-flex h-9 items-center gap-0.5 rounded-full border border-border bg-surface p-0.5" role="group" aria-label="Date range" data-testid="range">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={r === 30 ? "/dashboard" : `/dashboard?range=${r}`}
          aria-current={r === days ? "true" : undefined}
          className={cn(
            "flex h-8 items-center rounded-full px-3 text-xs whitespace-nowrap transition-colors",
            r === days ? "bg-brand font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r} days
        </Link>
      ))}
    </div>
  );
}
