import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { OverviewView } from "@/modules/overview";

const IMPACT = {
  high: { label: "High impact", variant: "low" },
  medium: { label: "Medium impact", variant: "mid" },
  low: { label: "Low impact", variant: "secondary" },
} as const;

export const OPPORTUNITIES_HREF = "/opportunities";

export function TopOpportunities({
  opportunities,
  hasScore,
}: {
  opportunities: OverviewView["opportunities"];
  hasScore: boolean;
}) {
  if (opportunities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasScore
          ? "Nothing to fix right now. New steps appear here after a scan finds something."
          : "Your first scan shows what to fix first to get recommended more."}
      </p>
    );
  }
  return (
    <ol className="flex flex-col divide-y divide-border" data-testid="top-opportunities">
      {opportunities.map((o) => (
        <li key={o.id} className="flex flex-col items-start gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
          {/* A fixed column so every title starts at the same x, whatever the badge says. */}
          <div className="flex shrink-0 sm:w-28">
            <Badge variant={IMPACT[o.impact].variant}>{IMPACT[o.impact].label}</Badge>
          </div>
          <Link href={OPPORTUNITIES_HREF} className="text-sm font-medium hover:text-primary hover:underline">
            {o.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}
