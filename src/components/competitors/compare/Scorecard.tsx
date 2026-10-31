import type { ReactNode } from "react";
import { cn } from "cn";
import type { Comparison } from "@/modules/competitors";
import { ScoreRing } from "../Marks";
import { CardHead } from "../SectionCard";
import { Sparkline } from "../Sparkline";
import { ByAi } from "./ByAi";

const of = (n: number, total: number) => `${n} of ${total} answers`;
const known = (values: (number | null)[]) => values.filter((v) => v !== null).length >= 2;

/**
 * Head to head (dashboard redesign, mockup-ui): both 30-day scores, the gap against the margin of error on your score
 * (D-64) and the margin itself as one joined strip; under it, `trend` (named at each scan) beside each AI tool's bars,
 * so neither column leaves an empty space under the numbers.
 */
export function Scorecard({ data, trend }: { data: Comparison; trend: ReactNode }) {
  const { why } = data.panel;
  const { you, them, margin } = data.scores;
  const gap = you !== null && them !== null ? you - them : null;
  // The words follow the standing, which weighs the gap against the margin: a gap inside it is "About the same".
  const gapText =
    gap === null || data.collecting || data.standing === null
      ? "Not compared yet"
      : data.standing === "about_same"
        ? "About the same"
        : `${Math.abs(gap)} pts ${data.standing}`;
  const inside = data.standing === "about_same" && gap !== null && gap !== 0;
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card" data-testid="scorecard">
      <div className={cn("grid grid-cols-2 gap-px bg-border", margin !== null ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {/* "You", then them: e2e tests read the two scores in this order. */}
        <div className="col-span-2 grid grid-cols-2 gap-px" data-testid="why-versus">
          <Stat label="You" value={you} sub={of(why.you, why.answers)} color="var(--chart-1)" spark={data.trend.map((p) => p.you)} you />
          <Stat label={data.title} value={them} sub={of(why.them, why.answers)} color={data.color} spark={data.trend.map((p) => p.them)} />
        </div>
        <Tile label="Gap" className={cn(margin === null && "col-span-2 lg:col-span-1")}>
          <span
            className={cn(
              "text-[22px] leading-tight font-semibold tracking-[-0.03em] tabular-nums",
              data.standing === "ahead" ? "text-good-text" : data.standing === "behind" ? "text-mid-text" : "text-foreground",
            )}
            data-testid="gap"
          >
            {gapText}
          </span>
          <span className="text-xs text-text-hint">{inside ? `${Math.abs(gap)} pts, inside the margin of error` : "Your score minus theirs"}</span>
        </Tile>
        {margin !== null && (
          <Tile label="Margin of error">
            <span className="text-[22px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">About {Math.round(margin)} pts</span>
            <span className="text-xs text-text-hint">A smaller gap is about the same</span>
          </Tile>
        )}
      </div>
      <div className="grid border-t border-border lg:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <CardHead title="Named at each scan" help="Each score is the share of all answers that named that business. Each point is one scan." />
          <div className="px-[18px] py-4">{trend}</div>
        </div>
        <div className="flex min-w-0 flex-col border-t border-border lg:border-t-0 lg:border-l">
          <CardHead title="By AI tool" help="Share of each AI's answers that named each of you, last 30 days." />
          <div className="px-[18px] py-4">
            {why.assistants.length > 0 ? (
              <ByAi name={data.title} assistants={why.assistants} color={data.color} />
            ) : (
              <p className="text-sm text-muted-foreground">Each AI tool shows here after a scan.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 bg-card px-[18px] pt-4 pb-3.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
  spark,
  you = false,
}: {
  label: string;
  value: number | null;
  sub: string;
  color: string;
  spark: (number | null)[];
  you?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-card px-[18px] pt-4 pb-3.5">
      <span className={cn("flex min-w-0 items-center gap-1.5 text-xs", you ? "font-medium text-primary" : "text-muted-foreground")} title={label}>
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="flex items-center gap-2">
          {value !== null && <ScoreRing value={value} color={color} size={28} />}
          <span className={cn("text-[26px] leading-tight font-semibold tracking-[-0.03em] tabular-nums", you && "text-primary")}>{value ?? "Not checked"}</span>
        </span>
        {/* With fewer than two scans the line would only say "Not enough scans": left out. */}
        {known(spark) && (
          <span className="hidden shrink-0 pb-1 sm:block">
            <Sparkline values={spark} you={you} color={color} />
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>
    </div>
  );
}
