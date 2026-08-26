"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { TrendPoint, CompetitorMetric } from "@/lib/geo/dashboard-aggregator";

// Business line gets the primary blue; competitors get muted sequential colors
const BUSINESS_COLOR = "#2563EB";
const COMPETITOR_COLORS = [
  "#94A3B8", "#64748B", "#CBD5E1", "#A1A1AA", "#D4D4CF", "#B0B7C3",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E5E1] rounded-xl px-3.5 py-3 text-[12px] shadow-lg"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p className="font-semibold text-[#171717] mb-2">{label}</p>
      {payload
        .filter((e: { value: number | null }) => e.value != null)
        .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
        .map((entry: { name: string; value: number; color: string }) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1 last:mb-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-[#777773] flex-1">{entry.name}:</span>
            <span className="font-bold text-[#171717]">{entry.value}%</span>
          </div>
        ))}
    </div>
  );
}

interface Props {
  businessName: string;
  trendSeries: TrendPoint[];
  competitors: CompetitorMetric[];
}

export default function CompetitorTrendChart({ businessName, trendSeries, competitors }: Props) {
  // Determine which competitors actually have data in the trend series
  const competitorsWithData = useMemo(() => {
    const names = new Set<string>();
    for (const point of trendSeries) {
      for (const [name, rate] of Object.entries(point.competitors)) {
        if (rate > 0) names.add(name);
      }
    }
    // If no competitor has non-zero data, still show them (they'll show 0)
    if (names.size === 0 && competitors.length > 0) {
      competitors.slice(0, 4).forEach((c) => names.add(c.name));
    }
    return Array.from(names).slice(0, 5);
  }, [trendSeries, competitors]);

  // Build chart data
  const chartData = useMemo(() =>
    trendSeries.map((point) => {
      const row: Record<string, string | number | null> = { date: point.date };
      row[businessName] = point.business;
      for (const name of competitorsWithData) {
        row[name] = point.competitors[name] ?? 0;
      }
      return row;
    }),
    [trendSeries, businessName, competitorsWithData],
  );

  if (trendSeries.length < 1) {
    return (
      <div className="h-52 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-[13px] font-medium text-[#777773]">No trend data yet</p>
        <p className="text-[12px] text-[#A3A3A0]">Run at least one scan to see the chart.</p>
      </div>
    );
  }

  // With only one data point we still render a single dot
  return (
    <div>
      {trendSeries.length === 1 && (
        <p className="text-[11px] text-[#A3A3A0] mb-3">Run more scans to see the full trend line.</p>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#A3A3A0" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#A3A3A0" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#555552", paddingTop: 8 }}
          />

          {/* Business line — primary, thick, solid */}
          <Line
            type="monotone"
            dataKey={businessName}
            stroke={BUSINESS_COLOR}
            strokeWidth={2.5}
            dot={{ r: 4, fill: BUSINESS_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: BUSINESS_COLOR, strokeWidth: 2, stroke: "white" }}
            connectNulls={false}
          />

          {/* Competitor lines — secondary, thin, dashed */}
          {competitorsWithData.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={{ r: 2.5, fill: COMPETITOR_COLORS[i % COMPETITOR_COLORS.length], strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend note if no competitor history */}
      {trendSeries.length >= 1 && competitorsWithData.length === 0 && competitors.length > 0 && (
        <p className="text-[11px] text-[#A3A3A0] text-center mt-2">
          Competitor lines will appear once scan data is available.
        </p>
      )}
    </div>
  );
}
