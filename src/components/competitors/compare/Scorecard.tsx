import { cn } from "cn";
import type { Comparison } from "@/modules/competitors";
import { ByAi } from "./ByAi";

const of = (n: number, total: number) => `${n} of ${total} answers`;

/**
 * Head to head (dashboard redesign): both 30-day scores, how many answers named each, the gap against the margin
 * of error on your score (D-64), and each AI tool as grouped bars.
 */
export function Scorecard({ data }: { data: Comparison }) {
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" data-testid="scorecard">
      <div className="grid grid-cols-2 content-start items-start gap-3 sm:grid-cols-3" data-testid="why-versus">
        <Stat label="You" value={you} sub={of(why.you, why.answers)} you />
        <Stat label={data.title} value={them} sub={of(why.them, why.answers)} color={data.color} />
        <div className="col-span-2 flex flex-col gap-1 rounded-md border border-border p-3 sm:col-span-1">
          <span className="text-xs text-muted-foreground">Gap</span>
          <span
            className={cn("text-xl leading-tight font-semibold tracking-[-0.02em] tabular-nums", data.standing === "ahead" ? "text-good-text" : data.standing === "behind" ? "text-mid-text" : "text-foreground")}
            data-testid="gap"
          >
            {gapText}
          </span>
          {inside && <span className="text-xs text-muted-foreground">{Math.abs(gap)} pts, inside the margin of error</span>}
          {margin !== null && <span className="text-xs text-muted-foreground">Margin of error is about {Math.round(margin)} pts</span>}
        </div>
        <p className="col-span-2 text-xs text-text-hint sm:col-span-3">Each score is the share of all answers that named that business.</p>
      </div>
      {why.assistants.length > 0 ? (
        <ByAi name={data.title} assistants={why.assistants} color={data.color} />
      ) : (
        <p className="text-sm text-muted-foreground">Each AI tool shows here after a scan.</p>
      )}
    </div>
  );
}

function Stat({ label, value, sub, you = false, color }: { label: string; value: number | null; sub: string; you?: boolean; color?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-md border p-3", you ? "border-primary/30 bg-primary-tint/50" : "border-border")}>
      <span className={cn("flex min-w-0 items-center gap-1.5 text-xs font-medium", you ? "text-primary" : "text-muted-foreground")} title={label}>
        {color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn("text-3xl font-semibold tracking-[-0.03em] tabular-nums", you ? "text-primary" : "text-foreground")}>{value ?? "Not checked"}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{sub}</span>
    </div>
  );
}
