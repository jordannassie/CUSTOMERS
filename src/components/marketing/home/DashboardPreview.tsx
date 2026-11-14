import { Globe, MessageSquareText, PieChart } from "lucide-react";
import { cn } from "cn";
import { PILL_BOX, PILL_CLASS } from "@/components/app/pills";
import { ChangeMark } from "@/components/overview/Panel";
import { ScoreRing } from "@/components/overview/ScoreRing";
import { AnswerDots, CitationBars, ShareDonut, StatRow, citedText, skippedText, type DonutPart } from "@/components/overview/StatCards";
import { colorAt } from "@/lib/series-colors";
import { TrendChart } from "@/components/overview/TrendChart";
import type { OverviewView } from "@/modules/overview";
import { ProductFrame } from "./ProductFrame";

// The made-up coffee shop every homepage demo uses (MVP_SPEC 12.2).
// Standings use the app's pills (pills.ts): blue where you are behind, grey otherwise.
const PICKS = [
  { name: "Daily Grind", score: 81, color: "bg-series-2", standing: "You're behind", tone: PILL_CLASS.attention },
  { name: "Bean House", score: 62, color: "bg-primary", you: true },
  { name: "Brew Lab", score: 57, color: "bg-series-3", standing: "About the same", tone: PILL_CLASS.plain },
  { name: "Cup & Co", score: 22, color: "bg-series-4", standing: "You're ahead", tone: PILL_CLASS.plain },
];

// Each business's share of AI picks for the donut, in the chart colours (you in blue).
const SHARE: DonutPart[] = [
  { name: "Daily Grind", isYou: false, percent: 38, color: colorAt(1) },
  { name: "Bean House", isYou: true, percent: 31, color: colorAt(0) },
  { name: "Brew Lab", isYou: false, percent: 22, color: colorAt(2) },
  { name: "Cup & Co", isYou: false, percent: 9, color: colorAt(3) },
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
      <div className={cn("grid border-b border-border", !hero && "lg:grid-cols-[minmax(0,1fr)_calc(320px*var(--px,1))]")}>
        <div className="flex items-center gap-5 px-[calc(18px*var(--px,1))] py-5 sm:gap-7">
          <div className="rounded-full bg-surface p-2 shadow-[0_0_0_1px_var(--cd-border),0_8px_24px_-12px_rgb(37_99_235/0.35)]">
            <ScoreRing score={62} tone="mid" size={hero ? "small" : "default"} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Visibility score, last 30 days</span>
              <span className="text-xs text-text-hint" aria-hidden="true">·</span>
              <span className="text-xs text-muted-foreground">Good confidence</span>
            </div>
            <p className={cn("leading-snug font-semibold tracking-[-0.02em] text-balance", hero ? "text-base" : "text-lg")}>
              AI recommended you in about 6 of 10 customer questions this month.
            </p>
            <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              <ChangeMark up />
              Up 4 points on last week
            </span>
          </div>
        </div>
        <div className={cn("grid gap-px border-t border-border bg-border sm:grid-cols-3", !hero && "lg:grid-cols-1 lg:border-t-0 lg:border-l")}>
          {/* The app Overview's cards with their pictures; stacked in the narrow hero. */}
          <StatRow
            stacked={hero}
            icon={PieChart}
            label="Share of AI picks"
            value="31%"
            sub={hero ? "#2 of 4" : "#2 by score of 4 businesses"}
            visual={<ShareDonut percent={31} parts={SHARE} />}
          />
          <StatRow
            stacked={hero}
            icon={MessageSquareText}
            label="Answers that named you"
            value="22 of 36"
            sub={skippedText(22, 36)}
            visual={<AnswerDots named={22} total={36} />}
          />
          <StatRow
            stacked={hero}
            icon={Globe}
            label="Website cited by AI"
            value="9 times"
            sub={citedText(9, 14)}
            visual={<CitationBars yours={9} theirs={14} />}
          />
        </div>
      </div>
      <div className={cn("grid", !hero && "lg:grid-cols-[minmax(0,1fr)_calc(320px*var(--px,1))]")}>
        {!hero && (
          <div className="flex min-w-0 flex-col gap-3 px-[calc(18px*var(--px,1))] py-4">
            <TrendChart trend={TREND} heading="h4" />
          </div>
        )}
        <div className={cn("flex min-w-0 flex-col", !hero && "border-t border-border lg:border-t-0 lg:border-l")}>
          <p className="border-b border-border px-[calc(18px*var(--px,1))] py-3 text-[length:calc(14.5px*var(--px,1))] font-semibold tracking-[-0.01em]">Who AI picks most</p>
          <ul>
            {(hero ? PICKS.slice(0, 3) : PICKS).map((p) => (
              <li
                key={p.name}
                className={cn(
                  "grid grid-cols-[calc(8px*var(--px,1))_calc(24px*var(--px,1))_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-[calc(18px*var(--px,1))] py-2.5 text-[length:calc(13px*var(--px,1))] last:border-b-0",
                  p.you && "bg-primary-tint/40",
                )}
              >
                <span className={cn("size-2 rounded-full", p.color)} aria-hidden="true" />
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-muted text-[length:calc(11px*var(--px,1))] font-semibold text-muted-foreground">
                  {p.name.charAt(0)}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={cn("truncate font-medium", p.you && "text-primary-hover")}>
                    {p.name}
                    {p.you && <span className="ml-1.5 rounded-sm bg-primary-tint px-1.5 py-px text-[length:calc(10.5px*var(--px,1))] text-primary-hover">You</span>}
                  </span>
                  <span className="h-1 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
                    <span className={cn("block h-full rounded-xs", p.color)} style={{ width: `${p.score}%` }} />
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="font-semibold tabular-nums">{p.score}</span>
                  {p.standing && <span className={cn(PILL_BOX, "h-[calc(18px*var(--px,1))] text-[length:calc(10.5px*var(--px,1))]", p.tone)}>{p.standing}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ProductFrame>
  );
}
