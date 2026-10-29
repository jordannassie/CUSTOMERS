import type { ReactNode } from "react";
import { cn } from "cn";

/** One number at the top of a page (dashboard redesign): a label, the value, and one line of context. */
export function KpiTile({ label, value, sub, tone, testId }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "mid"; testId?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-surface p-4" data-testid={testId}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("truncate text-2xl font-semibold tracking-[-0.02em] tabular-nums", tone === "good" && "text-good-text", tone === "mid" && "text-mid-text")}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function KpiStrip({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid={testId}>
      {children}
    </div>
  );
}
