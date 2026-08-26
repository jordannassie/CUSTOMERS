import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import type { CompetitorMetric } from "@/lib/geo/dashboard-aggregator";

interface Props {
  business: { id: string; name: string };
  mentionRate: number | null;
  competitors: CompetitorMetric[];
  totalResults: number;
}

export default function CompetitorLeaderboard({
  business,
  mentionRate,
  competitors,
  totalResults,
}: Props) {
  // Build unified leaderboard: business + tracked competitors
  const businessEntry = {
    id: "__business__",
    name: business.name,
    domain: null as string | null,
    mentionCount: mentionRate != null ? Math.round((mentionRate / 100) * totalResults) : null,
    mentionRate: mentionRate != null ? mentionRate / 100 : null,
    isYou: true,
  };

  const rows = [
    businessEntry,
    ...competitors.map((c) => ({ ...c, isYou: false })),
  ]
    .filter((r) => r.mentionRate != null || r.isYou)
    .sort((a, b) => {
      const ar = a.mentionRate ?? 0;
      const br = b.mentionRate ?? 0;
      if (a.isYou && ar === 0 && br === 0) return -1;
      return br - ar;
    });

  const yourRank = rows.findIndex((r) => r.isYou) + 1;
  const hasData = totalResults > 0;

  return (
    <div className="border-b border-[#EEEEEA]">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold text-[#171717]">Competitor Leaderboard</p>
          <p className="text-[10.5px] text-[#A3A3A0] mt-0.5">
            {hasData
              ? `Your rank: #${yourRank} of ${rows.length}`
              : "Run a scan to see results"}
          </p>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-4 py-1.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
        style={{ gridTemplateColumns: "16px 1fr 52px" }}
      >
        {["#", "Brand", "Vis."].map((h) => (
          <span key={h} className="text-[8.5px] font-bold text-[#A3A3A0] uppercase tracking-wider">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#EEEEEA]">
        {rows.map((row, i) => {
          const pct =
            row.mentionRate != null ? Math.round(row.mentionRate * 100) : null;

          return (
            <div
              key={row.id}
              className={`grid items-center px-4 py-2.5 ${
                row.isYou
                  ? "bg-[#F0FDF4]/60 border-l-2 border-l-[#10B981]"
                  : "hover:bg-[#F5F5F2] transition-colors"
              }`}
              style={{ gridTemplateColumns: "16px 1fr 52px" }}
            >
              <span className="text-[10px] text-[#A3A3A0] font-semibold">{i + 1}</span>
              <span className="flex items-center gap-1.5 min-w-0">
                <CompetitorAvatar name={row.name} size={16} />
                <span
                  className={`text-[11px] font-semibold truncate ${
                    row.isYou ? "text-[#166534]" : "text-[#777773]"
                  }`}
                >
                  {row.name}
                  {row.isYou && (
                    <span className="ml-1 text-[9px] font-bold text-[#10B981] uppercase tracking-wide">
                      You
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`text-[11px] font-bold tabular-nums ${
                  pct == null
                    ? "text-[#A3A3A0]"
                    : pct >= 50
                    ? "text-[#166534]"
                    : pct >= 25
                    ? "text-[#B45309]"
                    : "text-[#DC2626]"
                }`}
              >
                {pct != null ? `${pct}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ask Direct Agent CTA */}
      {hasData && competitors.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#EEEEEA] bg-[#FAFAF8]">
          <Link
            href={`/dashboard/direct-agent?q=${encodeURIComponent(
              `Why are my competitors outranking me in AI search? What should I do?`,
            )}`}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
          >
            <Bot size={11} aria-hidden="true" />
            Ask why competitors beat me
          </Link>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-[#EEEEEA]">
        <Link
          href="/dashboard/competitors"
          className="text-[11.5px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
        >
          Manage competitors <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
