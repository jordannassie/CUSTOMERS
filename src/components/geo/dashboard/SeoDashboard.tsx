"use client";

import { useState, useCallback } from "react";
import {
  Globe,
  TrendingUp,
  Link2,
  Search,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { SeoSnapshot, SeoKeyword } from "@/lib/seo/types";

interface SeoDashboardProps {
  businessId: string;
  businessName: string;
  domain: string | null;
  initialSnapshot: SeoSnapshot | null;
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[#A3A3A0]" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-[26px] font-bold text-[#171717] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-[#A3A3A0] mt-1">{sub}</p>}
    </div>
  );
}

function DifficultyBar({ score }: { score: number }) {
  const color =
    score < 30 ? "bg-green-400" : score < 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] text-[#777773]">{score}</span>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  const color =
    position <= 3
      ? "bg-[#F0FDF4] text-[#166534]"
      : position <= 10
        ? "bg-[#EFF6FF] text-[#1D4ED8]"
        : position <= 20
          ? "bg-[#FFFBEB] text-[#92400E]"
          : "bg-[#F5F5F2] text-[#777773]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${color}`}>
      #{position}
    </span>
  );
}

function ChangeIndicator({ change }: { change?: number }) {
  if (change === undefined || change === 0) return <Minus size={12} className="text-[#A3A3A0]" />;
  if (change < 0)
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-green-600">
        <ArrowUpRight size={11} />
        {Math.abs(change)}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-red-500">
      <ArrowDownLeft size={11} />
      {change}
    </span>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SeoDashboard({
  businessId,
  businessName,
  domain,
  initialSnapshot,
}: SeoDashboardProps) {
  const [snapshot, setSnapshot] = useState<SeoSnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "competitors" | "backlinks">(
    "overview",
  );

  const fetchSeo = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);

      try {
        const url = `/api/geo/seo?businessId=${businessId}${refresh ? "&refresh=1" : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to load SEO data.");
          return;
        }

        if (!data.ok) {
          if (data.reason === "not_configured") {
            setNotConfigured(true);
          } else {
            setError(data.message ?? "Failed to load SEO data.");
          }
          return;
        }

        setSnapshot(data.snapshot);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [businessId],
  );

  // No domain configured
  if (!domain) {
    return (
      <div>
        <h1 className="text-[18px] font-bold text-[#171717] mb-1">Search Intelligence</h1>
        <div className="rounded-xl border border-[#E5E5E1] bg-white p-8 text-center mt-4">
          <Globe size={28} className="text-[#A3A3A0] mx-auto mb-3" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-[#171717] mb-1">No domain configured</p>
          <p className="text-[13px] text-[#777773] mb-4">
            Add your website URL in Settings to enable SEO intelligence.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-[#171717] text-white px-4 py-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  // Not configured (no DataForSEO credentials)
  if (notConfigured) {
    return (
      <div>
        <h1 className="text-[18px] font-bold text-[#171717] mb-1">Search Intelligence</h1>
        <div className="rounded-xl border border-[#E5E5E1] bg-[#FAFAF8] p-8 text-center mt-4">
          <AlertCircle size={28} className="text-[#A3A3A0] mx-auto mb-3" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-[#171717] mb-1">SEO integration not active</p>
          <p className="text-[13px] text-[#777773]">
            DataForSEO credentials are not configured on this server. Contact support to enable SEO intelligence.
          </p>
        </div>
      </div>
    );
  }

  // Empty state (never fetched)
  if (!snapshot) {
    return (
      <div>
        <h1 className="text-[18px] font-bold text-[#171717] mb-1">Search Intelligence</h1>
        <p className="text-[13px] text-[#777773] mb-6">
          Keyword rankings, competitor gaps, and backlink analysis for{" "}
          <strong>{domain}</strong>.
        </p>
        <div className="rounded-xl border border-[#E5E5E1] bg-white p-10 text-center">
          <Search size={32} className="text-[#A3A3A0] mx-auto mb-4" aria-hidden="true" />
          <p className="text-[15px] font-bold text-[#171717] mb-2">Run your first SEO scan</p>
          <p className="text-[13px] text-[#777773] mb-6 max-w-sm mx-auto leading-relaxed">
            We&apos;ll pull keyword rankings, traffic estimates, competitor data, and
            backlink analysis for <strong>{domain}</strong>.
          </p>
          {error && (
            <p className="text-[12px] text-red-600 mb-4">{error}</p>
          )}
          <button
            onClick={() => fetchSeo(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[#171717] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Scanning…</>
            ) : (
              <><Search size={14} /> Run SEO Scan</>
            )}
          </button>
        </div>
      </div>
    );
  }

  const { overview, topKeywords, competitors, backlinks, keywordGaps } = snapshot;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-bold text-[#171717] mb-1">Search Intelligence</h1>
          <p className="text-[13px] text-[#777773] flex items-center gap-1.5">
            <Globe size={12} aria-hidden="true" />
            {snapshot.domain}
            <a
              href={`https://${snapshot.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A3A3A0] hover:text-[#777773] transition-colors"
              aria-label="Open website"
            >
              <ExternalLink size={11} />
            </a>
            <span className="text-[#D4D4CF]">·</span>
            <span className="text-[11px]">Updated {formatDate(snapshot.fetchedAt)}</span>
          </p>
        </div>
        <button
          onClick={() => fetchSeo(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#777773] hover:text-[#171717] border border-[#E5E5E1] rounded-lg px-3 py-2 hover:bg-[#F5F5F2] transition-colors disabled:opacity-60"
          aria-label="Refresh SEO data"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Ranking Keywords"
          value={fmt(overview.keywords)}
          sub="Google US"
          icon={Search}
        />
        <MetricCard
          label="Est. Monthly Traffic"
          value={fmt(overview.organicTraffic)}
          sub="organic visits"
          icon={TrendingUp}
        />
        <MetricCard
          label="Referring Domains"
          value={fmt(backlinks.referringDomains)}
          sub={`${fmt(backlinks.backlinks)} backlinks`}
          icon={Link2}
        />
        <MetricCard
          label="Domain Rank"
          value={overview.rank ?? "—"}
          sub="DataForSEO rank 0–100"
          icon={Globe}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-[#E5E5E1] mb-5">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "keywords", label: `Keywords (${topKeywords.length})` },
            { id: "competitors", label: `Competitors (${competitors.length})` },
            { id: "backlinks", label: "Backlinks" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-[12.5px] font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#A3A3A0] hover:text-[#777773]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-5">
          {/* Top keywords preview */}
          <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEEEEA] flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-[#171717]">Top ranking keywords</h2>
              <button
                onClick={() => setActiveTab("keywords")}
                className="text-[11px] text-[#777773] hover:text-[#171717] transition-colors"
              >
                View all
              </button>
            </div>
            <KeywordsTable keywords={topKeywords.slice(0, 8)} />
          </div>

          {/* Keyword gaps */}
          {keywordGaps.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#EEEEEA]">
                <h2 className="text-[13px] font-bold text-[#171717]">Competitor keyword gaps</h2>
                <p className="text-[11px] text-[#A3A3A0] mt-0.5">
                  Keywords where competitors rank but you don&apos;t
                </p>
              </div>
              <div className="divide-y divide-[#EEEEEA]">
                {keywordGaps.slice(0, 8).map((gap) => (
                  <div key={gap.keyword} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-[#171717] truncate">
                        {gap.keyword}
                      </p>
                      <p className="text-[11px] text-[#A3A3A0] truncate">
                        {gap.competitorDomain} — #{gap.competitorPosition}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold text-[#171717]">
                        {fmt(gap.searchVolume)}/mo
                      </p>
                      {gap.difficulty !== undefined && (
                        <DifficultyBar score={gap.difficulty} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keywords tab */}
      {activeTab === "keywords" && (
        <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEA]">
            <h2 className="text-[13px] font-bold text-[#171717]">Ranking keywords</h2>
            <p className="text-[11px] text-[#A3A3A0] mt-0.5">
              Keywords where {businessName} appears in Google search results (US, English)
            </p>
          </div>
          {topKeywords.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#A3A3A0]">
              No ranking keywords found for this domain.
            </div>
          ) : (
            <KeywordsTable keywords={topKeywords} showAll />
          )}
        </div>
      )}

      {/* Competitors tab */}
      {activeTab === "competitors" && (
        <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEA]">
            <h2 className="text-[13px] font-bold text-[#171717]">SEO competitors</h2>
            <p className="text-[11px] text-[#A3A3A0] mt-0.5">
              Domains competing in search for the same keywords
            </p>
          </div>
          {competitors.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#A3A3A0]">
              No SEO competitors identified yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]" role="table">
                <thead>
                  <tr className="border-b border-[#EEEEEA]">
                    {["Domain", "Est. Keywords", "Est. Traffic"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEA]">
                  {/* Your domain first */}
                  <tr className="bg-[#F5F5F2]">
                    <td className="px-5 py-3 font-semibold text-[#171717]">
                      {snapshot.domain}
                      <span className="ml-2 text-[10px] font-bold text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] px-1.5 py-0.5 rounded">
                        You
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#171717] font-semibold">
                      {fmt(overview.keywords)}
                    </td>
                    <td className="px-5 py-3 text-[#171717] font-semibold">
                      {fmt(overview.organicTraffic)}/mo
                    </td>
                  </tr>
                  {competitors.map((comp) => (
                    <tr key={comp.domain} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-5 py-3">
                        <a
                          href={`https://${comp.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#171717] hover:text-[#555552] transition-colors"
                        >
                          {comp.domain}
                          <ExternalLink size={10} className="text-[#A3A3A0]" />
                        </a>
                      </td>
                      <td className="px-5 py-3 text-[#555552]">{fmt(comp.keywords)}</td>
                      <td className="px-5 py-3 text-[#555552]">
                        {fmt(comp.organicTraffic)}/mo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Backlinks tab */}
      {activeTab === "backlinks" && (
        <div className="bg-white rounded-xl border border-[#E5E5E1] p-6">
          <h2 className="text-[13px] font-bold text-[#171717] mb-4">Backlink overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Referring domains", value: fmt(backlinks.referringDomains) },
              { label: "Total backlinks", value: fmt(backlinks.backlinks) },
              {
                label: "Domain rank",
                value: backlinks.rank !== undefined ? backlinks.rank : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#FAFAF8] rounded-lg border border-[#E5E5E1] p-4">
                <p className="text-[11px] text-[#A3A3A0] font-semibold uppercase tracking-wide mb-1">
                  {label}
                </p>
                <p className="text-[22px] font-bold text-[#171717]">{value}</p>
              </div>
            ))}
          </div>

          {/* Competitor backlink gaps */}
          {competitors.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-widest mb-3">
                Vs. competitors
              </p>
              <div className="flex flex-col gap-2">
                {competitors.slice(0, 5).map((comp) => (
                  <div
                    key={comp.domain}
                    className="flex items-center gap-3 py-2 border-b border-[#EEEEEA] last:border-0"
                  >
                    <span className="text-[12.5px] text-[#555552] flex-1">{comp.domain}</span>
                    <span className="text-[12px] text-[#A3A3A0]">
                      ~{fmt(comp.keywords)} keywords · {fmt(comp.organicTraffic)}/mo traffic
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#A3A3A0] mt-3">
                Detailed per-competitor backlink gap analysis requires manual domain comparison.
                Use the keyword gaps tab to identify link-worthy content opportunities.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KeywordsTable({
  keywords,
  showAll = false,
}: {
  keywords: SeoKeyword[];
  showAll?: boolean;
}) {
  const display = showAll ? keywords : keywords.slice(0, 8);

  if (display.length === 0) {
    return (
      <div className="p-8 text-center text-[13px] text-[#A3A3A0]">
        No ranking keywords found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]" role="table">
        <thead>
          <tr className="border-b border-[#EEEEEA]">
            {["Keyword", "Position", "Volume", "Difficulty", "Change"].map((h) => (
              <th
                key={h}
                className="px-5 py-3 text-left text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEEEEA]">
          {display.map((kw) => (
            <tr key={kw.keyword} className="hover:bg-[#FAFAF8] transition-colors">
              <td className="px-5 py-3 font-medium text-[#171717] max-w-[200px] truncate">
                {kw.keyword}
              </td>
              <td className="px-5 py-3">
                <PositionBadge position={kw.position} />
              </td>
              <td className="px-5 py-3 text-[#555552]">{fmt(kw.searchVolume)}/mo</td>
              <td className="px-5 py-3">
                {kw.difficulty !== undefined ? (
                  <DifficultyBar score={kw.difficulty} />
                ) : (
                  <span className="text-[#A3A3A0]">—</span>
                )}
              </td>
              <td className="px-5 py-3">
                <ChangeIndicator change={kw.positionChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
