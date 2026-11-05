"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";
import { cn } from "cn";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { WhyPanel } from "@/modules/competitors";
import { measures } from "./website-measures";

type Website = WhyPanel["website"];

/**
 * The two websites at a glance (B-93): a radar of four measures, their shape in coral and yours in blue on the same
 * 0 to 100 scale, so the gaps show as the parts of their shape yours doesn't cover. Beside it, every measure as written
 * counts. "Not checked" where your site wasn't read the same way.
 */
export function WebsiteScore({ name, website }: { name: string; website: Website }) {
  const rows = measures(website);
  const data = rows.map((m) => ({ axis: m.axis, them: m.them?.score ?? 0, you: m.you?.score ?? 0 }));
  const yoursRead = rows.some((m) => m.you !== null);
  const config = { you: { label: "You", color: "var(--chart-1)" }, them: { label: name, color: "var(--cd-rival)" } } satisfies ChartConfig;
  return (
    <div className="grid items-center gap-6 rounded-lg border border-border bg-surface p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="website-score">
      <figure className="m-0 flex flex-col items-center gap-2">
        <ChartContainer config={config} className="aspect-auto h-72 w-full max-w-md" aria-hidden="true">
          <RadarChart data={data} outerRadius="70%" margin={{ top: 12, right: 56, bottom: 12, left: 56 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar dataKey="them" stroke="var(--cd-rival)" strokeWidth={2} strokeDasharray="5 4" fill="var(--cd-rival)" fillOpacity={0.12} isAnimationActive={false} />
            {yoursRead && (
              <Radar
                dataKey="you"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="var(--chart-1)"
                fillOpacity={0.22}
                dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            )}
          </RadarChart>
        </ChartContainer>
        <figcaption className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-xs bg-primary/30 ring-2 ring-primary ring-inset" aria-hidden="true" />
            You
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <svg width="16" height="10" aria-hidden="true">
              <rect x="1" y="1" width="14" height="8" rx="2" fill="var(--cd-rival)" fillOpacity="0.12" stroke="var(--cd-rival)" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>
            <span className="truncate">{name}</span>
          </span>
        </figcaption>
        {!yoursRead && <p className="text-xs text-text-hint">Your website wasn&apos;t read the same way, so only theirs is drawn.</p>}
      </figure>

      <ul className="flex flex-col divide-y divide-border">
        {rows.map((m) => (
          <li key={m.key} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
            <p className="text-xs font-medium text-muted-foreground">{m.title}</p>
            {[
              { who: name, side: m.them, you: false },
              { who: "You", side: m.you, you: true },
            ].map((s) => (
              <span key={s.who} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className={cn("truncate", s.you ? "font-medium text-primary" : "text-foreground")} title={s.who}>
                  {s.who}
                </span>
                <span className="h-1.5 rounded-xs bg-muted" aria-hidden="true">
                  <span className={cn("block h-full rounded-xs", s.you ? "bg-primary" : "bg-rival")} style={{ width: `${s.side ? Math.max(s.side.score > 0 ? 3 : 0, s.side.score) : 0}%` }} />
                </span>
                <span className={cn("text-right tabular-nums", s.you ? "font-semibold text-primary" : "font-medium text-foreground")}>
                  {s.side === null ? "Not checked" : s.side.label}
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
