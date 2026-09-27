import Link from "next/link";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type UsageWidgetProps = {
  tone: "normal" | "warning" | "empty";
  headline: string;
  percentUsed: number | null;
  details: string[];
  showBuyCredits: boolean;
  buyCreditsHref: string;
};

const BAR_TONE = {
  normal: "",
  warning: "[&>[data-slot=progress-indicator]]:bg-mid",
  empty: "[&>[data-slot=progress-indicator]]:bg-low",
} as const;

// MVP_SPEC 8.2: always visible in the sidebar; red with "Buy credits" at 0 or below.
export function UsageWidget({ tone, headline, percentUsed, details, showBuyCredits, buyCreditsHref }: UsageWidgetProps) {
  const empty = tone === "empty";
  return (
    <section
      aria-label="Credits"
      data-testid="usage-widget"
      data-tone={tone}
      className={cn("rounded-md border p-3", empty ? "border-low/40 bg-low-bg" : "border-border bg-surface")}
    >
      <p className={cn("text-[13px] font-medium leading-snug tabular-nums", empty ? "text-low-text" : "text-foreground")}>
        {headline}
      </p>
      {percentUsed !== null && (
        <Progress
          value={percentUsed}
          aria-label={`${percentUsed}% of this period's credits used`}
          className={cn("mt-2.5 h-1.5", empty && "bg-surface", BAR_TONE[tone])}
        />
      )}
      {details.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs tabular-nums text-muted-foreground">
          {details.map((line) => (
            <li key={line} className={cn(empty && line.endsWith("over") && "font-medium text-low-text")}>
              {line}
            </li>
          ))}
        </ul>
      )}
      {showBuyCredits && (
        <Button asChild size="sm" className="mt-3 w-full">
          <Link href={buyCreditsHref}>Buy credits</Link>
        </Button>
      )}
    </section>
  );
}
