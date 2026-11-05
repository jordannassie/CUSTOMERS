import type { ReactNode } from "react";
import { cn } from "cn";
import { Sparkline } from "@/components/charts";

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
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-surface px-5 pt-[18px] pb-4" data-testid={testId}>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span
          className={cn(
            "truncate font-serif text-[30px] leading-tight font-normal tabular-nums",
            tone === "good" && "text-brand",
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

/** The tiles as a row of white cards on the ground (Check-in theme). */
export function KpiStrip({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid={testId}>
      {children}
    </div>
  );
}
