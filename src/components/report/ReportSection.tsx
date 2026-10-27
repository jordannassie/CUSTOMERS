import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { COLLECTING_TEXT, STANDING_TEXT } from "@/modules/competitors";
import type { CompetitorLine } from "@/modules/reports";

/** "2 · Score by AI tool" over the section's one-line finding. The number is its place among the sections shown. */
export function ReportSection({
  id,
  number,
  label,
  headline,
  children,
}: {
  id: string;
  number: number;
  label: string;
  headline?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`report-${id}`} className="report-section flex flex-col gap-4" data-testid={`report-section-${id}`}>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-primary tabular-nums">
          {number} · {label}
        </p>
        <h2 id={`report-${id}`} className="text-xl font-semibold tracking-[-0.02em] text-balance">
          {headline ?? label}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

// The same colours as the Competitors leaderboard; the standing itself comes from the score report (compareStatus).
const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;

export function StandingPill({ row }: { row: Pick<CompetitorLine, "standing" | "collecting" | "isYou"> }) {
  if (row.isYou) return <Badge variant="tint">You</Badge>;
  if (row.collecting) return <Badge variant="secondary">{COLLECTING_TEXT}</Badge>;
  if (!row.standing) return null;
  return (
    <Badge variant={STANDING_BADGE[row.standing]} data-testid="standing">
      {STANDING_TEXT[row.standing]}
    </Badge>
  );
}

export const IMPACT = {
  high: { label: "High impact", variant: "low" },
  medium: { label: "Medium impact", variant: "mid" },
  low: { label: "Low impact", variant: "secondary" },
} as const;

/** A plain table that wraps on paper and scrolls inside its box on a narrow phone, never the page. */
export function DocTable({ head, children, label }: { head: ReactNode; children: ReactNode; label: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm print:min-w-0" aria-label={label}>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground [&>th]:px-2.5 [&>th]:py-2 [&>th]:font-medium">
            {head}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0 [&_td]:px-2.5 [&_td]:py-2.5 [&_td]:align-top">
          {children}
        </tbody>
      </table>
    </div>
  );
}
