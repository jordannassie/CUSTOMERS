"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, Sector } from "recharts";
import { cn } from "cn";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { CompetitorChartsView } from "@/modules/competitors";

type Slice = CompetitorChartsView["share"][number];

const pct = (n: number) => `${Math.round(n)}%`;
const times = (n: number) => `${n} ${n === 1 ? "mention" : "mentions"}`;
const CONFIG = {} satisfies ChartConfig;

/**
 * Of every answer that named you or a tracked competitor, the share that named each one (2026-10-27). A donut whose
 * middle tells the story of the slice in focus: you by default, any other on hover or keyboard focus of a slice or its
 * row. No floating hover card, so nothing ever covers a number. Every slice is named and numbered in the list beside it,
 * so grey is never the only cue.
 */
export function ShareOfVoiceChart({ view }: { view: CompetitorChartsView }) {
  const you = view.share.find((s) => s.isYou);
  const [focus, setFocus] = useState<string | null>(null);
  if (view.mentions === 0 || !you) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="share-empty">
        AI has not named you or a tracked competitor yet. Shares show here after a scan where it does.
      </p>
    );
  }
  const slices = view.share.filter((s) => s.mentions > 0);
  const ranked = [...view.share].sort((a, b) => b.share - a.share || Number(b.isYou) - Number(a.isYou));
  const top = ranked[0];
  const shown = slices.find((s) => s.key === focus) ?? you;
  const active = slices.findIndex((s) => s.key === shown.key);

  return (
    <figure className="m-0 flex w-full flex-col gap-4" data-testid="share-of-voice-chart">
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-52" onMouseLeave={() => setFocus(null)}>
          <ChartContainer config={CONFIG} className="aspect-square h-full w-full" aria-hidden="true">
            <PieChart>
              <Pie
                data={slices}
                dataKey="share"
                nameKey="name"
                innerRadius="64%"
                outerRadius="88%"
                paddingAngle={slices.length > 1 ? 2 : 0}
                cornerRadius={3}
                startAngle={90}
                endAngle={-270}
                stroke="var(--card)"
                strokeWidth={2}
                activeIndex={active}
                activeShape={ActiveSlice}
                onMouseEnter={(_, i) => setFocus(slices[i]?.key ?? null)}
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.key} fill={s.color} className="cursor-pointer outline-none" />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          {/* The middle: the slice in focus, written out. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-live="polite">
            <span
              className={cn("text-3xl font-semibold tracking-[-0.03em] tabular-nums", shown.isYou ? "text-primary" : "text-foreground")}
              data-testid={shown.isYou ? "share-you" : "share-focus"}
            >
              {pct(shown.share)}
            </span>
            <span className="max-w-[7.5rem] truncate text-xs font-medium text-foreground" title={shown.name}>
              {shown.isYou ? "You" : shown.name}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{times(shown.mentions)}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {top.isYou ? (
              <span className="font-medium text-primary">You lead the AI picks</span>
            ) : (
              <>
                {top.name} leads with <span className="font-medium text-foreground tabular-nums">{pct(top.share)}</span>
              </>
            )}
          </p>
          <ol className="flex flex-col gap-1 text-sm">
            {ranked.map((s) => (
              <ShareRow key={s.key} slice={s} active={s.key === shown.key} onFocus={() => setFocus(s.mentions > 0 ? s.key : null)} onLeave={() => setFocus(null)} />
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="text-xs text-text-hint">Out of {times(view.mentions)} of these businesses in AI answers over the last 30 days.</figcaption>
    </figure>
  );
}

/** The slice in focus grows outward a little, with a thin ring outside it. */
function ActiveSlice(props: unknown) {
  const p = props as { cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string; cornerRadius?: number };
  return (
    <g>
      <Sector {...p} outerRadius={p.outerRadius + 5} cornerRadius={3} stroke="var(--card)" strokeWidth={2} />
      <Sector cx={p.cx} cy={p.cy} startAngle={p.startAngle} endAngle={p.endAngle} innerRadius={p.outerRadius + 8} outerRadius={p.outerRadius + 10} fill={p.fill} />
    </g>
  );
}

function ShareRow({ slice: s, active, onFocus, onLeave }: { slice: Slice; active: boolean; onFocus: () => void; onLeave: () => void }) {
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onFocus}
        onFocus={onFocus}
        onMouseLeave={onLeave}
        onBlur={onLeave}
        className={cn(
          "grid w-full grid-cols-[0.625rem_minmax(0,1fr)_auto_3rem] items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active ? "bg-muted" : "hover:bg-muted/60",
        )}
        data-testid="share-row"
      >
        <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
        <span className={cn("truncate", s.isYou ? "font-medium text-primary" : "text-foreground")} title={s.name}>
          {s.isYou ? "You" : s.name}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{s.mentions}</span>
        <span className={cn("text-right tabular-nums", s.isYou ? "font-semibold text-primary" : "font-medium text-foreground")}>{pct(s.share)}</span>
      </button>
    </li>
  );
}
