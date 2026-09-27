"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { OverviewView } from "@/modules/overview";

const config = { score: { label: "Visibility", color: "var(--primary)" } } satisfies ChartConfig;

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** Last 7 days, one point per day with checks; days without a scan leave a gap. */
export function TrendChart({ trend }: { trend: OverviewView["trend"] }) {
  const scanned = trend.filter((p) => p.score !== null);
  const summary = scanned.length
    ? `Daily visibility over the last 7 days: ${scanned.map((p) => `${dayLabel(p.date)} ${p.score}`).join(", ")}.`
    : "No scans in the last 7 days.";

  return (
    <figure className="m-0">
      <ChartContainer config={config} className="aspect-auto h-40 w-full" aria-hidden="true">
        <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} width={48} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(d) => dayLabel(String(d))} />} />
          <Line
            dataKey="score"
            type="monotone"
            stroke="var(--color-score)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-score)" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
