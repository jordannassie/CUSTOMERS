"use client";

import type React from "react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompetitorChartsView } from "@/modules/competitors";

const DOT: Record<string, string> = { ChatGPT: "bg-chatgpt", Claude: "bg-claude", Perplexity: "bg-perplexity" };

/** One blue, light to dark with the score, on the card's own white: a sequential scale, never a rainbow. */
const fill = (v: number) => `color-mix(in oklab, var(--chart-1) ${Math.round(8 + v * 0.84)}%, var(--card))`;
const STEPS = [0, 25, 50, 75, 100];

/**
 * How often each AI recommends you and your top competitors (2026-10-27), as a heat map: a row per business, a column
 * per AI, each cell's blue as deep as its score with the number written in it. The top score in each column is marked,
 * so "who does ChatGPT prefer" reads straight down a column and "where am I weak" straight along your row.
 */
export function ModelComparisonChart({ view }: { view: CompetitorChartsView }) {
  const { series, byModel } = view;
  const value = (m: (typeof byModel)[number], key: string) => (m[key] as number | null) ?? null;
  const best = byModel.map((m) => Math.max(...series.map((s) => value(m, s.key) ?? -1)));
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="model-comparison-chart">
      <div
        className="grid grid-cols-[minmax(0,5.5rem)_repeat(var(--models),minmax(0,1fr))] items-stretch gap-1 sm:grid-cols-[minmax(0,8.5rem)_repeat(var(--models),minmax(0,1fr))]"
        style={{ "--models": byModel.length } as React.CSSProperties}
        role="table"
        aria-label="Score by AI model"
      >
        <span role="columnheader" />
        {byModel.map((m) => (
          <span key={String(m.model)} role="columnheader" className="flex flex-col items-center justify-center gap-1 pb-1 text-[11px] font-medium sm:flex-row sm:gap-1.5 sm:text-xs">
            <span className={cn("size-2 rounded-full", DOT[String(m.model)] ?? "bg-muted-foreground")} aria-hidden="true" />
            {String(m.model)}
          </span>
        ))}
        {series.map((s) => (
          <div key={s.key} role="row" className="contents">
            <span
              role="rowheader"
              className={cn("flex min-w-0 items-center pr-2 text-[13px] leading-tight break-words line-clamp-2", s.isYou ? "font-semibold text-primary" : "text-foreground")}
              title={s.name}
            >
              {s.isYou ? "You" : s.name}
            </span>
            {byModel.map((m, i) => {
              const v = value(m, s.key);
              const top = v !== null && v > 0 && v === best[i];
              return (
                <Tooltip key={String(m.model)}>
                  <TooltipTrigger asChild>
                    <span
                      role="cell"
                      tabIndex={0}
                      className={cn(
                        "relative flex h-12 flex-col items-center justify-center rounded-xs text-sm font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        v === null ? "bg-muted text-xs font-normal text-text-hint" : v >= 50 ? "text-white" : "text-foreground",
                        top && "ring-2 ring-foreground ring-inset",
                      )}
                      style={v === null ? undefined : { background: fill(v) }}
                      data-testid="model-cell"
                    >
                      {v === null ? "No checks" : v}
                      {top && <span className={cn("text-[10px] font-medium leading-none", v >= 50 ? "text-white/85" : "text-muted-foreground")}>Top</span>}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {v === null ? `${String(m.model)} has no checks for ${s.isYou ? "you" : s.name} yet` : `${String(m.model)} named ${s.isYou ? "you" : s.name} in ${v}% of its answers`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-text-hint">
        <span>Share of each AI&apos;s answers that named each business, last 30 days.</span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          0
          <span className="flex h-2 w-24 overflow-hidden rounded-xs">
            {STEPS.map((v) => (
              <span key={v} className="flex-1" style={{ background: fill(v) }} />
            ))}
          </span>
          100
        </span>
      </figcaption>
    </figure>
  );
}
