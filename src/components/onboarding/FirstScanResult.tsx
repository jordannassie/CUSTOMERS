import { ScoreRing } from "@/components/overview/ScoreRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FirstScanSummary } from "@/modules/onboarding";

const IMPACT = {
  high: { label: "High impact", variant: "low" },
  medium: { label: "Medium impact", variant: "mid" },
  low: { label: "Low impact", variant: "secondary" },
} as const;

/** The one screen between the first scan and the dashboard (DB-010): score, who AI named most, the first fix. */
export function FirstScanResult({ summary }: { summary: FirstScanSummary }) {
  return (
    <div className="flex flex-col gap-6" data-testid="first-scan-result">
      <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {summary.score && (
          <div className="flex items-center gap-5 px-4 py-4">
            <dt className="sr-only">Your score</dt>
            <ScoreRing score={summary.score.value} tone={summary.score.tone} size="small" />
            <dd className="text-[15px] leading-snug font-semibold tracking-[-0.01em]">{summary.score.sentence}</dd>
          </div>
        )}
        {summary.namedMost && (
          <div className="flex flex-col gap-1 px-4 py-3.5">
            <dt className="text-[13px] text-muted-foreground">Named most by AI</dt>
            <dd className="text-sm" data-testid="named-most">
              {summary.namedMost}
            </dd>
          </div>
        )}
        {summary.firstFix && (
          <div className="flex flex-col gap-1.5 px-4 py-3.5">
            <dt className="text-[13px] text-muted-foreground">Fix this first</dt>
            <dd className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3" data-testid="first-fix">
              <Badge variant={IMPACT[summary.firstFix.impact].variant}>{IMPACT[summary.firstFix.impact].label}</Badge>
              <span className="text-sm font-medium">{summary.firstFix.title}</span>
            </dd>
          </div>
        )}
      </dl>
      <div>
        {/* A full load: the app layout was rendered without the app frame during setup. */}
        <Button asChild className="min-w-32">
          <a href="/dashboard">Go to your dashboard</a>
        </Button>
      </div>
    </div>
  );
}
