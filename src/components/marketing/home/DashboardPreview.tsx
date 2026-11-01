import { Globe, MessageSquareText, PieChart } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { ChangeMark } from "@/components/overview/Panel";
import { ScoreRing } from "@/components/overview/ScoreRing";
import { StatRow } from "@/components/overview/StatRow";
import { TrendChart } from "@/components/overview/TrendChart";
import type { OverviewView } from "@/modules/overview";
import { ProductFrame } from "./ProductFrame";

// The made-up coffee shop every homepage demo uses (MVP_SPEC 12.2).
const PICKS = [
  { name: "Daily Grind", score: 81, color: "bg-series-2", standing: "You're behind", tone: "text-mid-text" },
  { name: "Bean House", score: 62, color: "bg-primary", you: true },
  { name: "Brew Lab", score: 57, color: "bg-series-3", standing: "About the same", tone: "text-muted-foreground" },
  { name: "Cup & Co", score: 22, color: "bg-series-4", standing: "You're ahead", tone: "text-good-text" },
];

const TREND: OverviewView["trend"] = {
  points: [53, 54, 56, 55, 57, 58, 58, 60, 61, 62].map((score, i) => {
    const day = 20 + i;
    return { date: `2026-09-${String(day).padStart(2, "0")}`, label: `Sep ${day}`, score, margin: 6, band: [score - 6, score + 6] };
  }),
  change: { direction: "up", text: "Up 9 points since Sep 20" },
  summary: null,
  caption: "Each dot is a day with a scan. The shaded band is how far the score could be off.",
};

/**
 * The redesigned Overview (mockup-ui) with example data: the score ring, the three numbers and who AI picks most. The
 * hero shows it compact; the "What you see" tab adds the trend chart.
 */
export function DashboardPreview({ variant = "full" }: { variant?: "hero" | "full" }) {
  const hero = variant === "hero";
  return (
    <ProductFrame page="Overview" note={hero ? undefined : "Scans every day"}>
      <div className={cn("grid border-b border-border", !hero && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="flex items-center gap-5 bg-primary-tint/40 px-[18px] py-5 sm:gap-7">
          <div className="rounded-full bg-surface p-2 shadow-[0_0_0_1px_var(--cd-border),0_8px_24px_-12px_rgb(37_99_235/0.35)]">
            <ScoreRing score={62} tone="mid" size={hero ? "small" : "default"} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Visibility score, last 30 days</span>
              <Badge variant="tint">Good confidence</Badge>
            </div>
            <p className={cn("leading-snug font-semibold tracking-[-0.02em] text-balance", hero ? "text-base" : "text-lg")}>
              AI recommended you in about 6 of 10 customer questions this month.
            </p>
            <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-good-bg px-2 py-0.5 text-xs font-medium text-good-text">
              <ChangeMark up />
              Up 4 points on last week
            </span>
          </div>
        </div>
        <div className={cn("grid gap-px border-t border-border bg-border sm:grid-cols-3", !hero && "lg:grid-cols-1 lg:border-t-0 lg:border-l")}>
          <StatRow icon={PieChart} label="Share of AI picks" value="31%" sub="#2 by score of 4" />
          <StatRow icon={MessageSquareText} label="Answers that named you" value="22 of 36" />
          <StatRow icon={Globe} label="Your website cited" value="9 times" />
        </div>
      </div>
      <div className={cn("grid", !hero && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        {!hero && (
          <div className="flex min-w-0 flex-col gap-3 px-[18px] py-4">
            <TrendChart trend={TREND} heading="h4" />
          </div>
        )}
        <div className={cn("flex min-w-0 flex-col", !hero && "border-t border-border lg:border-t-0 lg:border-l")}>
          <p className="border-b border-border px-[18px] py-3 text-[14.5px] font-semibold tracking-[-0.01em]">Who AI picks most</p>
          <ul>
            {(hero ? PICKS.slice(0, 3) : PICKS).map((p) => (
              <li
                key={p.name}
                className={cn(
                  "grid grid-cols-[8px_24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-[18px] py-2.5 text-[13px] last:border-b-0",
                  p.you && "bg-primary-tint/40",
                )}
              >
                <span className={cn("size-2 rounded-full", p.color)} aria-hidden="true" />
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {p.name.charAt(0)}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={cn("truncate font-medium", p.you && "text-primary-hover")}>
                    {p.name}
                    {p.you && <span className="ml-1.5 rounded-sm bg-primary-tint px-1.5 py-px text-[10.5px] text-primary-hover">You</span>}
                  </span>
                  <span className="h-1 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
                    <span className={cn("block h-full rounded-xs", p.color)} style={{ width: `${p.score}%` }} />
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="font-semibold tabular-nums">{p.score}</span>
                  {p.standing && <span className={cn("text-[11px]", p.tone)}>{p.standing}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ProductFrame>
  );
}
