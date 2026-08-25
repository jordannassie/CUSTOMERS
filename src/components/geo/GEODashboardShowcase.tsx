"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Zap,
  Bot,
  FileBarChart,
  BarChart3,
  Users,
  Link2,
  MessagesSquare,
  Lightbulb,
} from "lucide-react";

const TABS = [
  { id: "visibility", label: "Visibility", icon: BarChart3 },
  { id: "competitors", label: "Competitors", icon: Users },
  { id: "prompts", label: "Prompts", icon: MessagesSquare },
  { id: "opportunities", label: "Opportunities", icon: Lightbulb },
  { id: "reports", label: "Reports", icon: FileBarChart },
] as const;
type TabId = (typeof TABS)[number]["id"];

const CHART_VALS = [22, 25, 26, 24, 30, 33, 35];
const COMPETITORS = [
  { domain: "topcompetitor.com", score: 62, delta: "+3", rank: 1 },
  { domain: "yourbusiness.com", score: 35, delta: "+12", rank: 2, isYou: true },
  { domain: "localrival.com", score: 31, delta: "-2", rank: 3 },
  { domain: "anotherco.com", score: 18, delta: "+1", rank: 4 },
];
const PROMPTS = [
  { text: "Best HVAC company near me", appearances: 3, total: 5, trend: "up" },
  { text: "Emergency AC repair [city]", appearances: 1, total: 5, trend: "up" },
  { text: "HVAC maintenance contracts", appearances: 0, total: 5, trend: "flat" },
  { text: "Air conditioning installation cost", appearances: 2, total: 5, trend: "up" },
  { text: "Local HVAC contractors reviews", appearances: 1, total: 5, trend: "flat" },
];
const OPPORTUNITIES = [
  { priority: "High", prompt: "Best HVAC company near me", gap: "Appear in 0/5 model runs", fix: "Add FAQ page answering this prompt directly" },
  { priority: "High", prompt: "Emergency AC repair", gap: "Competitor cited 4× more", fix: "Improve citation quality on business directories" },
  { priority: "Medium", prompt: "HVAC maintenance plans", gap: "Missing from Claude + Gemini", fix: "Create dedicated maintenance plans page" },
  { priority: "Low", prompt: "AC replacement cost", gap: "Appears inconsistently", fix: "Add clear pricing information to website" },
];
const CITATION_SOURCES = [
  { name: "Google Business Profile", impact: "High", status: "OK" },
  { name: "Yelp", impact: "High", status: "Incomplete" },
  { name: "BBB", impact: "Medium", status: "Missing" },
  { name: "HomeAdvisor", impact: "Medium", status: "OK" },
];

function VisibilityTab() {
  const max = Math.max(...CHART_VALS);
  const PLATFORMS = [
    { name: "ChatGPT", n: 7, total: 10, color: "#10B981" },
    { name: "Claude", n: 5, total: 10, color: "#F59E0B" },
    { name: "Perplexity", n: 6, total: 10, color: "#8B5CF6" },
    { name: "Google AI", n: 3, total: 10, color: "#3B82F6" },
  ];
  return (
    <div className="p-5">
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-1">Direct Score</p>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-black text-[#0F172A]">35.1%</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5 mb-0.5"><TrendingUp size={10} />+11.9%</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-1">Avg Position</p>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-black text-[#0F172A]">#2.4</span>
            <span className="text-xs font-bold text-emerald-500 mb-0.5">↑ +0.8</span>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-0.5 h-16 mb-2">
        {CHART_VALS.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-sm"
            style={{ height: `${(v/max)*100}%`, minHeight: 3, backgroundColor: i===CHART_VALS.length-1 ? "#2563EB" : "#DBEAFE" }}
          />
        ))}
      </div>
      <p className="text-[10px] text-[#94A3B8] mb-5">7-day visibility trend</p>
      <div className="flex flex-col gap-2">
        {PLATFORMS.map(({ name, n, total, color }) => (
          <div key={name} className="flex items-center gap-2.5">
            <span className="text-[11px] font-medium text-[#64748B] w-20 shrink-0">{name}</span>
            <div className="flex gap-0.5 flex-1">
              {Array.from({ length: total }).map((_, j) => (
                <div key={j} className="flex-1 h-1.5 rounded-full"
                  style={{ backgroundColor: j < n ? color : "#E2E8F0" }} />
              ))}
            </div>
            <span className="text-[10px] text-[#94A3B8] w-7 text-right">{n}/{total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorsTab() {
  return (
    <div className="p-5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-3">Visibility Ranking</p>
      <div className="flex flex-col gap-1.5">
        {COMPETITORS.map(({ domain, score, delta, rank, isYou }) => (
          <div key={domain} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isYou ? "bg-[#EFF6FF] border border-[#DBEAFE]" : "bg-gray-50"}`}>
            <span className={`text-[10px] font-black w-5 text-center ${isYou ? "text-[#2563EB]" : "text-[#94A3B8]"}`}>#{rank}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${isYou ? "text-[#1D4ED8]" : "text-[#0F172A]"}`}>
                {domain}
                {isYou && <span className="ml-1.5 text-[9px] font-black text-[#2563EB] uppercase">You</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-1.5 rounded-full bg-gray-200 w-16 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: isYou ? "#2563EB" : "#CBD5E1" }} />
              </div>
              <span className="text-[10px] font-bold text-[#64748B] w-8 text-right">{score}%</span>
              <span className={`text-[10px] font-bold w-7 text-right ${delta.startsWith("+") ? "text-emerald-500" : "text-red-400"}`}>{delta}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
        <p className="text-[11px] font-bold text-amber-800 mb-1">Top competitor insight</p>
        <p className="text-[10px] text-amber-700">topcompetitor.com wins 12 prompts where you don&apos;t appear. They have stronger citation profiles on Yelp and HomeAdvisor.</p>
      </div>
    </div>
  );
}

function PromptsTab() {
  return (
    <div className="p-5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-3">Tracked Prompts</p>
      <div className="flex flex-col gap-1.5">
        {PROMPTS.map(({ text, appearances, total, trend }) => (
          <div key={text} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#0F172A] truncate">{text}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-0.5">
                {Array.from({ length: total }).map((_, j) => (
                  <div key={j} className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: j < appearances ? "#2563EB" : "#E2E8F0" }} />
                ))}
              </div>
              <span className="text-[10px] text-[#94A3B8]">{appearances}/{total}</span>
              <span className="text-[10px]">{trend === "up" ? "↑" : "→"}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#94A3B8] mt-3">Showing 5 of 47 tracked prompts · Updated on last scan</p>
    </div>
  );
}

function OpportunitiesTab() {
  return (
    <div className="p-5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-3">Prioritized Actions</p>
      <div className="flex flex-col gap-2">
        {OPPORTUNITIES.map(({ priority, prompt, gap, fix }) => (
          <div key={prompt} className="border border-gray-100 rounded-xl p-3 bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                priority === "High" ? "bg-red-50 text-red-600" :
                priority === "Medium" ? "bg-amber-50 text-amber-600" :
                "bg-gray-50 text-gray-500"
              }`}>{priority}</span>
              <span className="text-xs font-semibold text-[#0F172A] leading-snug flex-1">{prompt}</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mb-1.5">{gap}</p>
            <div className="flex items-start gap-1.5">
              <Zap size={9} className="text-[#2563EB] shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-[#2563EB] leading-snug">{fix}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="p-5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-3">Citation Analysis</p>
      <div className="flex flex-col gap-1.5 mb-4">
        {CITATION_SOURCES.map(({ name, impact, status }) => (
          <div key={name} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
            <Link2 size={12} className="text-[#94A3B8] shrink-0" />
            <span className="text-xs font-medium text-[#0F172A] flex-1">{name}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              impact === "High" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
            }`}>{impact}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              status === "OK" ? "bg-emerald-50 text-emerald-600" :
              status === "Incomplete" ? "bg-amber-50 text-amber-600" :
              "bg-red-50 text-red-500"
            }`}>{status}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl px-3 py-2.5 flex items-start gap-2">
        <Bot size={12} className="text-[#2563EB] shrink-0 mt-0.5" />
        <p className="text-[10px] font-medium text-[#1D4ED8]">
          Direct Agent: &ldquo;Completing your Yelp profile could improve visibility on 8 relevant prompts based on competitor citations.&rdquo;
        </p>
      </div>
    </div>
  );
}

export default function GEODashboardShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("visibility");

  const FEATURES = [
    { icon: BarChart3, label: "Real AI responses", desc: "We run actual buyer-intent prompts and record exactly what each AI says — not estimated rankings." },
    { icon: Users, label: "Competitor intelligence", desc: "See which competitors appear on every prompt you miss, and what sources give them the edge." },
    { icon: Lightbulb, label: "Prioritized opportunities", desc: "Every gap is turned into a concrete action with the evidence behind it." },
    { icon: Bot, label: "Direct Agent", desc: "Ask your data anything in plain English. Get answers grounded in real scan evidence." },
  ];

  return (
    <section className="bg-white py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          {/* Left: features */}
          <div>
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.12em] text-[#64748B] mb-4">
              What You&apos;ll See
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-[1.08] tracking-tight mb-5">
              Your complete AI visibility picture.
            </h2>
            <p className="text-base text-[#475569] leading-relaxed mb-10">
              Track your Direct Score, discover which competitors AI recommends instead of you, understand what citations and sources drive those answers, and get specific fixes — all in one dashboard.
            </p>

            <div className="flex flex-col gap-6 mb-10">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] border border-[#EDE9FE] flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-[#7C3AED]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A] mb-1">{label}</p>
                    <p className="text-sm text-[#64748B] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#1d4ed8] transition-colors text-sm shadow-lg shadow-blue-500/20"
            >
              Check My AI Visibility — Free
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Right: mock dashboard */}
          <div className="lg:sticky lg:top-24">
            <div
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: "0 8px 48px rgba(15,23,42,0.10)" }}
            >
              {/* Chrome */}
              <div className="bg-[#0F172A] px-5 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/15" />
                  ))}
                </div>
                <span className="text-white/35 text-[11px]">dashboard.customers.direct</span>
              </div>

              {/* Business selector */}
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-red-100 text-red-600 text-[9px] font-black flex items-center justify-center shrink-0">
                    B
                  </div>
                  <span className="text-[12px] font-semibold text-[#0F172A]">yourbusiness.com</span>
                </div>
                <span className="text-[9px] text-[#94A3B8] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">Last 7 days</span>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === id
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
                    }`}
                  >
                    <Icon size={11} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "visibility" && <VisibilityTab />}
              {activeTab === "competitors" && <CompetitorsTab />}
              {activeTab === "prompts" && <PromptsTab />}
              {activeTab === "opportunities" && <OpportunitiesTab />}
              {activeTab === "reports" && <ReportsTab />}
            </div>

            <p className="text-center text-xs text-[#94A3B8] mt-4">
              Representative dashboard — your actual data will vary
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
