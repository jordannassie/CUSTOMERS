"use client";

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { cn } from "cn";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { PairPoint } from "@/modules/competitors";

const pct = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

/**
 * The headline of the comparison (B-93): how often AI named each of you, as two rings (you outside in blue, them inside
 * in grey) with the gap in the middle, and the two scores at each scan. Each ring is named beside it with its number,
 * so color is never the only cue.
 */
export function HeadToHead({ name, them, you, answers, trend }: { name: string; them: number; you: number; answers: number; trend: PairPoint[] }) {
  const sides = [
    { who: "You", n: you, value: pct(you, answers), you: true },
    { who: name, n: them, value: pct(them, answers), you: false },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" data-testid="head-to-head">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">How often AI named each of you</p>
        <div className="flex flex-wrap items-center gap-5" data-testid="why-versus">
          <Rings you={sides[0].value} them={sides[1].value} />
          <ul className="flex min-w-0 flex-1 flex-col gap-3">
            {sides.map((s) => (
              <li key={s.who} className="flex min-w-0 items-start gap-2.5">
                <span className={cn("mt-1.5 h-2.5 w-4 shrink-0 rounded-xs", s.you ? "bg-primary" : "bg-competitor-1")} aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className={cn("truncate text-xs font-medium", s.you ? "text-primary" : "text-muted-foreground")} title={s.who}>
                    {s.who}
                  </span>
                  <span className={cn("text-2xl font-semibold tracking-[-0.03em] tabular-nums", s.you ? "text-primary" : "text-foreground")}>{s.value}%</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {s.n} of {answers} answers
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-text-hint">Answers to your questions in the last 30 days.</p>
      </div>
      <Trend name={name} trend={trend} />
    </div>
  );
}

const RINGS = { size: 148, stroke: 13, gap: 5 };

/** Two rings on one 0 to 100 scale, from the top, clockwise; the gap between you in points in the middle. */
function Rings({ you, them }: { you: number; them: number }) {
  const { size, stroke, gap } = RINGS;
  const outer = (size - stroke) / 2;
  const inner = outer - stroke - gap;
  const diff = you - them;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid="versus-rings">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        {[
          { r: outer, value: you, color: "var(--chart-1)" },
          { r: inner, value: them, color: "var(--chart-2)" },
        ].map((ring) => {
          const length = 2 * Math.PI * ring.r;
          return (
            <g key={ring.r}>
              <circle cx={size / 2} cy={size / 2} r={ring.r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
              {ring.value > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ring.r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${(Math.min(100, ring.value) / 100) * length} ${length}`}
                  className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
                />
              )}
            </g>
          );
        })}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("text-xl font-semibold tabular-nums", diff > 0 ? "text-good-text" : diff < 0 ? "text-mid-text" : "text-foreground")}>
          {diff === 0 ? "Even" : `${Math.abs(diff)} pts`}
        </span>
        {diff !== 0 && <span className="text-[11px] text-muted-foreground">{diff > 0 ? "you're ahead" : "behind them"}</span>}
      </span>
    </div>
  );
}

function Trend({ name, trend }: { name: string; trend: PairPoint[] }) {
  const config = { you: { label: "You", color: "var(--chart-1)" }, them: { label: name, color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2" data-testid="pair-trend">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="text-sm font-medium text-foreground">Score at each scan</span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          You
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke="var(--chart-2)" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
          </svg>
          <span className="truncate">{name}</span>
        </span>
      </div>
      {trend.length < 2 ? (
        <p className="flex min-h-32 items-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
          The trend starts after your second scan.
        </p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-36 w-full" aria-hidden="true">
          <ComposedChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="pair-you-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" minTickGap={24} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<PairTooltip name={name} />} />
            <Area dataKey="you" type="monotone" fill="url(#pair-you-fill)" stroke="none" connectNulls isAnimationActive={false} tooltipType="none" />
            <Line dataKey="them" type="monotone" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="you" type="monotone" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "var(--chart-1)" }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ChartContainer>
      )}
      <figcaption className="sr-only">
        {trend.map((p) => `${p.label}: you ${p.you ?? "no checks"}, ${name} ${p.them ?? "no checks"}`).join("; ")}
      </figcaption>
    </figure>
  );
}

function PairTooltip({ name, active, payload }: { name: string; active?: boolean; payload?: { payload: PairPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">Scan on {p.label}</p>
      <p className="flex justify-between gap-4">
        <span className="font-medium text-primary">You</span>
        <span className="tabular-nums">{p.you ?? "No checks"}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="truncate text-muted-foreground">{name}</span>
        <span className="tabular-nums">{p.them ?? "No checks"}</span>
      </p>
    </div>
  );
}
