"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import BotIcon from "@/components/BotIcon";
import Link from "next/link";
import type { VisibilityResultWithPrompt } from "@/lib/geo/dashboard-data";
import { PlatformIcon } from "@/components/PlatformIcon";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  google_ai_overviews: "Google AI",
};

const FILTER_OPTIONS = [
  { id: "all",    label: "All" },
  { id: "won",    label: "Won" },
  { id: "lost",   label: "Lost" },
  { id: "cited",  label: "Cited" },
] as const;

type Filter = (typeof FILTER_OPTIONS)[number]["id"];

function agentQuestion(result: VisibilityResultWithPrompt): string {
  const prompt = result.prompt ?? "this prompt";
  const competitors =
    result.competitors_mentioned.length > 0
      ? result.competitors_mentioned.map((c) => c.name).join(", ")
      : "competitors";
  if (!result.business_mentioned) {
    return `Why didn't my business appear in AI results for the prompt: "${prompt}"? Competitors mentioned: ${competitors}. What should I fix?`;
  }
  return `How can I improve my position for the prompt: "${prompt}"? I was mentioned at position #${result.mention_position ?? "?"}. What would move me to #1?`;
}

export default function PromptPerformanceTable({
  results,
}: {
  results: VisibilityResultWithPrompt[];
}) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<Filter>("all");

  const filtered = results.filter((r) => {
    const matchesSearch =
      !search || (r.prompt ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "won"   && r.business_mentioned) ||
      (filter === "lost"  && !r.business_mentioned) ||
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A0] pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#E5E5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]/20 bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#F0F0EC] rounded-lg p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === opt.id
                  ? "bg-white text-[#171717] shadow-sm"
                  : "text-[#777773] hover:text-[#171717]"
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
            <tr className="border-b border-[#EEEEEA]">
              <th className="text-left text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-5 py-2.5">
                Prompt
              </th>
              <th className="text-left text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">
                Model
              </th>
              <th className="text-left text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">
                Result
              </th>
              <th className="text-left text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">
                Competitors
              </th>
              <th className="text-right text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-5 py-2.5 whitespace-nowrap">
                Citations
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEA]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A3A3A0]">
                  {results.length === 0
                    ? "Run a scan to see prompt performance."
                    : "No prompts match your filter."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#F5F5F2] transition-colors group">
                {/* Prompt + agent CTA */}
                <td className="px-5 py-3 max-w-[280px]">
                  <span className="block text-[13px] text-[#171717] font-medium line-clamp-2 leading-snug mb-0.5">
                    {r.prompt ?? (
                      <span className="text-[#A3A3A0] italic">prompt removed</span>
                    )}
                  </span>
                  <Link
                    href={`/dashboard/direct-agent?q=${encodeURIComponent(agentQuestion(r))}`}
                    className="hidden group-hover:inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
                  >
                    <BotIcon size={12} />
                    {r.business_mentioned ? "Improve position" : "Why didn't I win?"}
                  </Link>
                </td>

                {/* Provider chip */}
                <td className="px-4 py-3">
                  <ProviderChip provider={r.provider} />
                </td>

                {/* Mentioned / position */}
                <td className="px-4 py-3">
                  {r.business_mentioned ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#166534]">
                      <CheckCircle2 size={13} />
                      Won
                      {r.mention_position != null && (
                        <span className="text-[10.5px] text-[#A3A3A0] font-normal bg-[#F0F0EC] rounded px-1">
                          #{r.mention_position}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#A3A3A0]">
                      <XCircle size={13} />
                      Not mentioned
                    </span>
                  )}
                </td>

                {/* Competitors */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  {r.competitors_mentioned.length > 0 ? (
                    <span className="text-[11.5px] text-[#DC2626] font-medium">
                      {r.competitors_mentioned.map((c) => c.name).join(", ")}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#A3A3A0]">—</span>
                  )}
                </td>

                {/* Citations */}
                <td className="px-5 py-3 text-right">
                  {r.cited_sources.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#777773]">
                      <ExternalLink size={11} />
                      {r.cited_sources.length}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#A3A3A0]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-[11px] text-[#A3A3A0] mt-3 px-0.5">
          Showing {filtered.length} of {results.length} results · Hover a row to ask the Direct Agent
        </p>
      )}
    </div>
  );
}

function ProviderChip({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#777773] bg-[#F5F5F2] border border-[#E5E5E1] px-2 py-0.5 rounded-md">
      <PlatformIcon platform={label} size={12} />
      {label}
    </span>
  );
}
