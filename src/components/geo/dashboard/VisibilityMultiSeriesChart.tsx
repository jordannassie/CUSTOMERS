"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { VisibilityScore } from "@/types/geo";

type Metric = "score" | "mention_rate" | "competitor_share" | "citation_rate";

const METRIC_CONFIG: Record<Metric, { label: string; color: string; format: (v: number) => string }> = {
  score:            { label: "Direct Score",   color: "#3B82F6", format: (v) => `${v}` },
  mention_rate:     { label: "AI Visibility",  color: "#10B981", format: (v) => `${v}%` },
  competitor_share: { label: "Share of Voice", color: "#8B5CF6", format: (v) => `${v}%` },
  citation_rate:    { label: "Citation Rate",  color: "#F59E0B", format: (v) => `${v}%` },
};

interface ChartPoint {
  date: string;
  score: number;
  mention_rate: number;
  competitor_share: number;
  citation_rate: number;
}

interface Props {
  history: VisibilityScore[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white border border-[#E5E5E1] rounded-xl px-3.5 py-3 text-[12px] shadow-lg"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
    >
      <p className="font-semibold text-[#171717] mb-2">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => {
        const cfg = Object.values(METRIC_CONFIG).find((c) => c.label === entry.name);
        return (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-[#777773]">{entry.name}:</span>
            <span className="font-bold text-[#171717]">
              {cfg ? cfg.format(entry.value) : entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function VisibilityMultiSeriesChart({ history }: Props) {
  const [activeMetric, setActiveMetric] = useState<Metric>("mention_rate");

  if (history.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-[13px] text-[#A3A3A0]">
        Run at least two scans to see your visibility trend.
      </div>
    );
  }

  const data: ChartPoint[] = history.map((h) => ({
    date: new Date(h.calculated_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: h.score,
    mention_rate: Math.round((h.mention_rate ?? 0) * 100),
    competitor_share: Math.round((h.competitor_share ?? 0) * 100),
    citation_rate: Math.round((h.citation_rate ?? 0) * 100),
  }));

  const cfg = METRIC_CONFIG[activeMetric];

  return (
    <div>
      {/* Metric toggle pills */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {(Object.entries(METRIC_CONFIG) as [Metric, typeof METRIC_CONFIG[Metric]][]).map(
          ([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveMetric(key)}
              className={`px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors border ${
                activeMetric === key
                  ? "text-white border-transparent"
                  : "text-[#777773] bg-white border-[#E5E5E1] hover:border-[#D4D4CF]"
              }`}
              style={activeMetric === key ? { background: meta.color, borderColor: meta.color } : {}}
            >
              {meta.label}
            </button>
          ),
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cfg.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#A3A3A0" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={activeMetric === "score" ? [0, 100] : [0, 100]}
            tick={{ fontSize: 10, fill: "#A3A3A0" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (activeMetric === "score" ? `${v}` : `${v}%`)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#777773" }}
          />
          <Area
            type="monotone"
            dataKey={activeMetric}
            name={cfg.label}
            stroke={cfg.color}
            strokeWidth={2}
            fill={`url(#grad-${activeMetric})`}
            dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: cfg.color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
