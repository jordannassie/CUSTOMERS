import type { ReactNode } from "react";
import { cn } from "cn";
import { Sparkline } from "@/components/competitors/Sparkline";

type KpiTileProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "good" | "mid";
  testId?: string;
  /** The last scans, drawn as a small line to the right of the value (mockup-ui). Hidden with fewer than 2 scans. */
  trend?: (number | null)[];
  trendColor?: string;
  /** A change chip (PointsChange) shown on the context line. */
  change?: ReactNode;
};

/** One number at the top of a page: a label, the value, an optional trend line, and one line of context. */
export function KpiTile({ label, value, sub, tone, testId, trend, trendColor, change }: KpiTileProps) {
  const showTrend = trend && trend.filter((v) => v !== null).length >= 2;
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface px-[18px] pt-4 pb-3.5" data-testid={testId}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span
          className={cn(
            "truncate text-[26px] leading-tight font-semibold tracking-[-0.03em] tabular-nums",
            tone === "good" && "text-good-text",
            tone === "mid" && "text-mid-text",
          )}
        >
          {value}
        </span>
        {showTrend && (
          <span className="shrink-0 pb-1">
            <Sparkline values={trend} color={trendColor ?? "var(--chart-1)"} />
          </span>
        )}
      </div>
      {(sub || change) && (
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {change}
          {sub && <span className="truncate">{sub}</span>}
        </span>
      )}
    </div>
  );
}

/** The tiles joined into one bordered strip, hairlines between them (PromptWatch-style). */
export function KpiStrip({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4" data-testid={testId}>
      {children}
    </div>
  );
}
