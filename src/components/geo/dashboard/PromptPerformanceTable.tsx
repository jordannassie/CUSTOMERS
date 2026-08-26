"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import type { VisibilityResultWithPrompt } from "@/lib/geo/dashboard-data";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  google_ai_overviews: "Google AI",
};

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "cited", label: "Cited" },
] as const;

type Filter = (typeof FILTER_OPTIONS)[number]["id"];

export default function PromptPerformanceTable({ results }: { results: VisibilityResultWithPrompt[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = results.filter((r) => {
    const matchesSearch =
      !search || (r.prompt ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "won" && r.business_mentioned) ||
      (filter === "lost" && !r.business_mentioned) ||
      (filter === "cited" && r.cited_sources.length > 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === opt.id
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-5 py-2.5">
                Prompt
              </th>
              <th className="text-left text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">
                Provider
              </th>
              <th className="text-left text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">
                Mentioned
              </th>
              <th className="text-left text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">
                Competitors
              </th>
              <th className="text-right text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">
                Citations
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#94A3B8]">
                  {results.length === 0 ? "Run a scan to see prompt performance." : "No prompts match your filter."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-5 py-3 max-w-[280px]">
                  <span className="block text-[13px] text-[#0F172A] font-medium line-clamp-2 leading-snug">
                    {r.prompt ?? <span className="text-[#94A3B8] italic">prompt removed</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ProviderChip provider={r.provider} />
                </td>
                <td className="px-4 py-3">
                  {r.business_mentioned ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#16A34A]">
                      <CheckCircle2 size={13} />
                      Won
                      {r.mention_position && (
                        <span className="text-[#94A3B8] font-normal">#{r.mention_position}</span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#94A3B8]">
                      <XCircle size={13} />
                      Not mentioned
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {r.competitors_mentioned.length > 0 ? (
                    <span className="text-[12px] text-[#64748B]">
                      {r.competitors_mentioned.map((c) => c.name).join(", ")}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#94A3B8]">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {r.cited_sources.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2563EB]">
                      <ExternalLink size={11} />
                      {r.cited_sources.length}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#94A3B8]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-[11px] text-[#94A3B8] mt-3 px-0.5">
          Showing {filtered.length} of {results.length} results
        </p>
      )}
    </div>
  );
}

function ProviderChip({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  const colors: Record<string, string> = {
    openai: "bg-[#F0FDF4] text-[#15803D]",
    anthropic: "bg-[#FDF4FF] text-[#7E22CE]",
    perplexity: "bg-[#EFF6FF] text-[#1D4ED8]",
    google_ai_overviews: "bg-[#FFFBEB] text-[#B45309]",
  };
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
        colors[provider] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}
