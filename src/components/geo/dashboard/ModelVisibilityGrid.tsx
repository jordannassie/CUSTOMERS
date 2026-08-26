import { CheckCircle2, XCircle } from "lucide-react";
import { PlatformIcon } from "@/components/PlatformIcon";
import type { ModelMetric } from "@/lib/geo/dashboard-aggregator";

interface Props {
  models: ModelMetric[];
}

export default function ModelVisibilityGrid({ models }: Props) {
  if (models.length === 0) {
    return (
      <p className="text-[12px] text-[#A3A3A0] px-1">
        Run a scan to see model-by-model results.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {models.map((m) => {
        const pct = Math.round(m.mentionRate * 100);
        return (
          <div
            key={m.provider}
            className="bg-white rounded-xl border border-[#E5E5E1] p-3.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#171717]">
                <PlatformIcon platform={m.label} size={14} />
                {m.label}
              </span>
              {m.mentions > 0 ? (
                <CheckCircle2 size={13} className="text-[#10B981]" />
              ) : (
                <XCircle size={13} className="text-[#D4D4CF]" />
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: m.color,
                }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-[10.5px]">
              <span
                className="font-bold tabular-nums"
                style={{
                  color:
                    pct >= 50
                      ? "#166534"
                      : pct >= 25
                      ? "#B45309"
                      : pct > 0
                      ? "#DC2626"
                      : "#A3A3A0",
                }}
              >
                {pct}% visibility
              </span>
              <span className="text-[#A3A3A0] tabular-nums">
                {m.mentions}/{m.total} prompts
                {m.avgPosition != null && (
                  <> · avg #{m.avgPosition}</>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
