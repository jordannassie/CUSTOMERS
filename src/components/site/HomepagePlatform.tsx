"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BarChart3,
  MessageCircle,
  PhoneIncoming,
  TrendingUp,
  Check,
  Zap,
  Users,
  Building2,
  FileBarChart,
  Shield,
  ChevronRight,
  Radar,
  Stethoscope,
  ListChecks,
  Wrench,
  RefreshCw,
} from "lucide-react";

// ─── Shared primitives ────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-black uppercase tracking-[0.12em] text-[#64748B] mb-4">
      {children}
    </span>
  );
}

function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-[1.08] tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

// ─── Mock Dashboard Widget ────────────────────────────────────

const CHART_VALS = [22, 25, 26, 24, 30, 33, 35];
const COVERAGE = [
  { name: "ChatGPT", n: 7, total: 10, color: "#10B981" },
  { name: "Claude", n: 5, total: 10, color: "#F59E0B" },
  { name: "Perplexity", n: 6, total: 10, color: "#8B5CF6" },
  { name: "Google AI", n: 3, total: 10, color: "#3B82F6" },
];

function DirectScoreWidget() {
  const max = Math.max(...CHART_VALS);
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden w-full max-w-[360px] mx-auto lg:mx-0"
      style={{ boxShadow: "0 24px 80px rgba(15,23,42,0.13), 0 4px 16px rgba(15,23,42,0.05)" }}
    >
      {/* Window chrome */}
      <div className="bg-[#0F172A] px-4 py-2.5 flex items-center gap-2.5">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/15" />)}
        </div>
        <span className="text-white/40 text-[11px] font-medium ml-1">Customers.Direct — AI Search Visibility</span>
      </div>

      {/* Business row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 text-[10px] font-black flex items-center justify-center shrink-0">
            B
          </div>
          <span className="text-[13px] font-semibold text-[#0F172A]">yourbusiness.com</span>
        </div>
        <span className="text-[10px] text-[#94A3B8] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
          Last 7 days
        </span>
      </div>

      {/* Score + mini chart */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-1.5">
          Visibility Score
        </p>
        <div className="flex items-end gap-2.5 mb-3">
          <span className="text-[38px] font-black text-[#0F172A] leading-none">35.1%</span>
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5 mb-1">
            <TrendingUp size={11} />
            +11.9%
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-10">
          {CHART_VALS.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${(v / max) * 100}%`,
                minHeight: 3,
                backgroundColor: i === CHART_VALS.length - 1 ? "#2563EB" : "#DBEAFE",
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#CBD5E1]">7 days ago</span>
          <span className="text-[9px] text-[#CBD5E1]">Today</span>
        </div>
      </div>

      {/* Platform coverage */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-2.5">
          AI Platform Coverage
        </p>
        <div className="flex flex-col gap-2">
          {COVERAGE.map(({ name, n, total, color }) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#64748B] w-16 shrink-0">{name}</span>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: total }).map((_, j) => (
                  <div key={j} className="flex-1 h-1.5 rounded-full"
                    style={{ backgroundColor: j < n ? color : "#E2E8F0" }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#94A3B8] w-6 text-right shrink-0">{n}/{total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity alert */}
      <div className="mx-4 mb-3 mt-1 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
        <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-amber-800">3 opportunities detected</p>
          <p className="text-[10px] text-amber-600 mt-0.5">
            Top competitor wins 4 prompts where you don&apos;t appear
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
        <span className="text-[10px] text-[#94A3B8]">47 prompts · 4 AI models</span>
        <Link href="/signup" className="text-[11px] font-bold text-[#2563EB] flex items-center gap-0.5 hover:gap-1.5 transition-all">
          Scan my business <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}

// ─── Section 1: Hero ─────────────────────────────────────────

const AI_PLATFORMS = [
  { name: "ChatGPT", color: "#10B981", bg: "#D1FAE5" },
  { name: "Claude", color: "#D97706", bg: "#FEF3C7" },
  { name: "Perplexity", color: "#7C3AED", bg: "#EDE9FE" },
  { name: "Gemini", color: "#1A73E8", bg: "#DBEAFE" },
  { name: "Google AI", color: "#1A73E8", bg: "#EFF6FF" },
];

function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden pt-10 pb-0 sm:pt-16 px-4 border-b border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center pb-16 lg:pb-24">
          {/* Left */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse inline-block" />
              AI Customer Acquisition Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black text-[#0F172A] leading-[1.06] tracking-tight mb-5">
              Customers.Direct helps AI send customers{" "}
              <span className="text-[#2563EB]">directly to your business</span>.
            </h1>

            <p className="text-lg text-[#475569] leading-relaxed mb-8 max-w-lg">
              Measure your visibility across ChatGPT, Claude, Perplexity and Google AI.
              Identify gaps, fix them, and track whether more customers find you.
            </p>

            <div className="flex flex-wrap gap-3 mb-7">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#1d4ed8] transition-colors text-sm shadow-lg shadow-blue-500/25"
              >
                Check My AI Visibility — Free
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 border border-gray-200 text-[#0F172A] font-semibold px-6 py-3.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm"
              >
                See How It Works
              </Link>
            </div>

            <p className="text-xs text-[#94A3B8] mb-8">
              Free first scan · No credit card required · Takes 2 minutes
            </p>

            {/* Platform strip */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-3">
                Tracked across
              </p>
              <div className="flex flex-wrap gap-2">
                {AI_PLATFORMS.map(({ name, color, bg }) => (
                  <span
                    key={name}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ color, backgroundColor: bg }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Dashboard mock */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="w-full max-w-[360px] lg:max-w-none">
              <DirectScoreWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 2: The Shift ────────────────────────────────────

const DISCOVERY_CHANNELS = [
  { name: "ChatGPT", sub: "Conversational AI", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { name: "Claude", sub: "Research assistant", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { name: "Perplexity", sub: "AI search engine", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { name: "Google AI", sub: "AI Overviews", color: "#1A73E8", bg: "#EFF6FF", border: "#BFDBFE" },
  { name: "Gemini", sub: "Google's AI", color: "#1A73E8", bg: "#F0F9FF", border: "#BAE6FD" },
  { name: "Social Media", sub: "DMs & Reels", color: "#EC4899", bg: "#FDF2F8", border: "#FBCFE8" },
];

function TheShiftSection() {
  return (
    <section className="bg-[#F8FAFC] py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel>The New Discovery Reality</SectionLabel>
            <H2 className="mb-5">
              Your customers aren&apos;t searching in{" "}
              <span className="text-[#2563EB]">one place anymore</span>.
            </H2>
            <p className="text-base text-[#475569] leading-relaxed mb-8 max-w-lg">
              Buyers now ask AI assistants for recommendations before they open a search results page. If your business isn&apos;t in those answers, you&apos;re invisible to those customers — regardless of your Google ranking.
            </p>
            <div className="flex flex-col gap-3">
              {[
                "AI answers have no page 2 — if you're not in the top mentions, you don't exist",
                "ChatGPT, Claude and Perplexity now influence millions of purchase decisions",
                "Traditional SEO tools can't tell you what AI is saying about your business",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={10} className="text-[#2563EB]" />
                  </div>
                  <span className="text-sm text-[#475569] leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DISCOVERY_CHANNELS.map(({ name, sub, color, bg, border }) => (
                <div
                  key={name}
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: bg, borderColor: border }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 font-black text-sm"
                    style={{ backgroundColor: color + "20", color }}
                  >
                    {name[0]}
                  </div>
                  <p className="text-sm font-bold text-[#0F172A]">{name}</p>
                  <p className="text-xs mt-0.5" style={{ color: color + "CC" }}>{sub}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-[#94A3B8] mt-4">
              Customers.Direct monitors visibility across the platforms that drive decisions today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Platform Products ────────────────────────────

const PRODUCTS = [
  {
    phase: "Get Found",
    label: "AI Search Visibility",
    description:
      "Know when ChatGPT, Claude, Perplexity and Google AI recommend your business — measure your Direct Score, identify gaps, and track improvements over time.",
    href: "/ai-search",
    icon: BarChart3,
    accent: "#7C3AED",
    bg: "#F5F3FF",
    border: "#EDE9FE",
    cta: "Measure My AI Visibility",
    highlights: [
      "Real buyer-intent prompts, real AI responses",
      "Direct Score + weekly trend tracking",
      "Competitor comparison across all platforms",
    ],
    tag: "Strategic — Start Here",
  },
  {
    phase: "Get Answered",
    label: "AI Employee",
    description:
      "Every call gets answered by a professional AI that works alongside your staff — handling after-hours, overflow, and qualifying leads 24/7.",
    href: "/ai-employee",
    icon: Bot,
    accent: "#2563EB",
    bg: "#EFF6FF",
    border: "#DBEAFE",
    cta: "Meet Your AI Employee",
    highlights: [
      "Never miss a customer call again",
      "Qualifies leads and books next steps",
      "Keeps your existing business phone number",
    ],
    tag: null,
  },
  {
    phase: "Get Conversations",
    label: "DM Ads",
    description:
      "Done-for-you direct message campaigns that start real conversations with people who are interested in your business — not just impressions.",
    href: "/dm-ads",
    icon: MessageCircle,
    accent: "#0891B2",
    bg: "#ECFEFF",
    border: "#CFFAFE",
    cta: "Start More Conversations",
    highlights: [
      "Targeted to buyers already interested",
      "Managed campaigns with real outcomes",
      "Conversations that convert to customers",
    ],
    tag: null,
  },
  {
    phase: "Convert Visitors",
    label: "Call Bar",
    description:
      "A lightweight one-tap mobile Call Bar that turns your website visitors into phone calls — free to build, customize and embed on any site.",
    href: "/call-bar",
    icon: PhoneIncoming,
    accent: "#059669",
    bg: "#ECFDF5",
    border: "#D1FAE5",
    cta: "Build Your Call Bar",
    highlights: [
      "One-tap calling from any mobile browser",
      "Free to create and embed",
      "Works on any website without coding",
    ],
    tag: "Free",
  },
] as const;

function PlatformProductsSection() {
  return (
    <section className="bg-white py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>The Platform</SectionLabel>
          <H2 className="mb-4">
            One platform.{" "}
            <span className="text-[#2563EB]">Every step of the customer journey.</span>
          </H2>
          <p className="text-base text-[#475569] max-w-2xl mx-auto leading-relaxed">
            From AI discovery to answered calls, started conversations, and converted visitors — Customers.Direct covers the complete acquisition path.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PRODUCTS.map(({ phase, label, description, href, icon: Icon, accent, bg, border, cta, highlights, tag }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border bg-white p-7 flex flex-col hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderColor: border }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                  >
                    <Icon size={18} style={{ color: accent }} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>
                      {phase}
                    </span>
                    <span className="block text-base font-black text-[#0F172A] mt-0.5">{label}</span>
                  </div>
                </div>
                {tag && (
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shrink-0"
                    style={{ backgroundColor: bg, color: accent, border: `1px solid ${border}` }}
                  >
                    {tag}
                  </span>
                )}
              </div>

              <p className="text-sm text-[#64748B] leading-relaxed mb-5">{description}</p>

              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                      <Check size={9} style={{ color: accent }} aria-hidden="true" />
                    </div>
                    <span className="text-sm text-[#475569]">{h}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-1 text-sm font-bold transition-all" style={{ color: accent }}>
                {cta}
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: AI Search Showcase ───────────────────────────

const SHOWCASE_TABS = ["Visibility", "Competitors", "Opportunities"] as const;
type ShowcaseTab = (typeof SHOWCASE_TABS)[number];

const COMPETITORS_MOCK = [
  { domain: "competitor-a.com", score: 62, delta: "+3", rank: 1 },
  { domain: "yourbusiness.com", score: 35, delta: "+12", rank: 2, isYou: true },
  { domain: "competitor-b.com", score: 31, delta: "-2", rank: 3 },
  { domain: "competitor-c.com", score: 18, delta: "+1", rank: 4 },
];

const OPPORTUNITIES_MOCK = [
  { priority: "High", prompt: "Best HVAC company in [city]", gap: "Appears in 0/5 runs", fix: "Add FAQ page answering this query" },
  { priority: "High", prompt: "Emergency AC repair near me", gap: "Competitor cited 4x more", fix: "Improve citation quality on directories" },
  { priority: "Medium", prompt: "HVAC maintenance plans", gap: "Missing from Claude + Gemini", fix: "Create service page for maintenance plans" },
];

function AISearchShowcase({ activeTab, setActiveTab }: { activeTab: ShowcaseTab; setActiveTab: (t: ShowcaseTab) => void }) {
  const maxScore = Math.max(...CHART_VALS);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 8px 40px rgba(15,23,42,0.08)" }}
    >
      {/* Mock app header */}
      <div className="bg-[#0F172A] px-5 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/15" />)}
        </div>
        <span className="text-white/40 text-xs font-medium">dashboard.customers.direct</span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 px-1">
        {SHOWCASE_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "Visibility" && (
          <div>
            <div className="flex items-end gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-1">Direct Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-[#0F172A]">35.1%</span>
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5 mb-1"><TrendingUp size={10} />+11.9%</span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-1 h-14 mb-2">
              {CHART_VALS.map((v, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all"
                  style={{ height: `${(v/maxScore)*100}%`, minHeight: 3, backgroundColor: i === CHART_VALS.length-1 ? "#2563EB" : "#DBEAFE" }}
                />
              ))}
            </div>
            <p className="text-[10px] text-[#94A3B8]">Showing 47 tracked prompts across ChatGPT, Claude, Perplexity and Google AI</p>
          </div>
        )}

        {activeTab === "Competitors" && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-3">Visibility Ranking</p>
            <div className="flex flex-col gap-2">
              {COMPETITORS_MOCK.map(({ domain, score, delta, rank, isYou }) => (
                <div key={domain} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isYou ? "bg-[#EFF6FF] border border-[#DBEAFE]" : "bg-gray-50"}`}>
                  <span className={`text-[10px] font-black w-4 text-center ${isYou ? "text-[#2563EB]" : "text-[#94A3B8]"}`}>#{rank}</span>
                  <span className={`text-xs font-semibold flex-1 ${isYou ? "text-[#1D4ED8]" : "text-[#0F172A]"}`}>
                    {domain}
                    {isYou && <span className="ml-1.5 text-[9px] font-black text-[#2563EB] uppercase tracking-wider">You</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-gray-200 w-16 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: isYou ? "#2563EB" : "#CBD5E1" }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#64748B] w-8">{score}%</span>
                    <span className={`text-[10px] font-bold w-8 text-right ${delta.startsWith("+") ? "text-emerald-500" : "text-red-400"}`}>{delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Opportunities" && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] mb-3">Prioritized Actions</p>
            <div className="flex flex-col gap-2">
              {OPPORTUNITIES_MOCK.map(({ priority, prompt, gap, fix }) => (
                <div key={prompt} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${priority === "High" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                      {priority}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A] leading-snug">{prompt}</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mb-1">{gap}</p>
                  <div className="flex items-center gap-1.5">
                    <Zap size={9} className="text-[#2563EB] shrink-0" />
                    <p className="text-[10px] font-medium text-[#2563EB]">{fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AISearchFeatureSection() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("Visibility");

  const FEATURES = [
    { icon: Radar, label: "Direct Score", desc: "A single visibility score that tracks how often AI mentions your business across all platforms, updated on every scan." },
    { icon: Users, label: "Competitor Rankings", desc: "See exactly which competitors appear instead of you — on which prompts, how often, and with what sources." },
    { icon: Zap, label: "Opportunity Engine", desc: "Every visibility gap is automatically turned into a concrete, prioritized recommendation you can act on today." },
    { icon: Bot, label: "Direct Agent", desc: "Ask your visibility data anything in plain language. Why did my score drop? Which competitor is winning? What should I fix first?" },
  ];

  return (
    <section className="bg-[#F8FAFC] py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div>
            <SectionLabel>AI Search Visibility</SectionLabel>
            <H2 className="mb-5">
              See exactly how AI sees{" "}
              <span className="text-[#7C3AED]">your business</span>.
            </H2>
            <p className="text-base text-[#475569] leading-relaxed mb-10">
              Track whether ChatGPT, Claude, Perplexity and Google AI recommend you, which competitors appear instead, what sources influence the answers, and exactly what to fix next.
            </p>

            <div className="flex flex-col gap-6">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#EDE9FE] flex items-center justify-center shrink-0 shadow-sm">
                    <Icon size={17} className="text-[#7C3AED]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A] mb-1">{label}</p>
                    <p className="text-sm text-[#64748B] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                href="/ai-search"
                className="inline-flex items-center gap-2 bg-[#7C3AED] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#6D28D9] transition-colors text-sm"
              >
                Explore AI Search Visibility
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <AISearchShowcase activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5: The Loop ─────────────────────────────────────

const LOOP_STEPS = [
  { icon: Radar, label: "Monitor", desc: "We run real buyer-intent prompts across every major AI platform on a schedule." },
  { icon: Stethoscope, label: "Detect", desc: "Find every visibility gap — which prompts you miss, which competitors win, and why." },
  { icon: ListChecks, label: "Recommend", desc: "Every gap becomes a prioritized, concrete action — not a generic checklist." },
  { icon: Wrench, label: "Fix", desc: "Send the fix to your team or implement directly through the Direct Agent workflow." },
  { icon: RefreshCw, label: "Measure Again", desc: "Rescan after changes. See whether your Direct Score actually improved." },
] as const;

function TheLoopSection() {
  return (
    <section className="bg-white py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>The Methodology</SectionLabel>
          <H2 className="mb-4">
            Detect. Fix.{" "}
            <span className="text-[#2563EB]">Measure. Repeat.</span>
          </H2>
          <p className="text-base text-[#475569] max-w-xl mx-auto leading-relaxed">
            Not a one-time audit — a continuous intelligence loop that keeps you ahead of competitors and aligned with how AI recommends businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {LOOP_STEPS.map(({ icon: Icon, label, desc }, i) => (
            <div key={label} className="relative">
              {i < LOOP_STEPS.length - 1 && (
                <div className="hidden lg:block absolute right-0 top-7 w-4 h-px bg-gray-200 translate-x-full z-10" />
              )}
              <div
                className="bg-white rounded-2xl border border-gray-100 p-5 h-full flex flex-col"
                style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black text-[#CBD5E1]">0{i+1}</span>
                </div>
                <p className="text-sm font-bold text-[#0F172A] mb-2">{label}</p>
                <p className="text-xs text-[#64748B] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Agency ───────────────────────────────────────

const AGENCY_FEATURES = [
  { icon: Building2, label: "Multiple clients, one login", desc: "Manage unlimited client businesses from a single account with instant switching." },
  { icon: FileBarChart, label: "White-label reports", desc: "Share branded reports with your agency logo — clients see your brand, not ours." },
  { icon: Users, label: "Per-client subscriptions", desc: "Each business has its own subscription, analytics, and billing relationship." },
  { icon: Shield, label: "You own the relationship", desc: "Customers.Direct bills your agency. What you charge clients is your business." },
] as const;

function AgencySection() {
  return (
    <section id="agency" className="bg-[#0F172A] py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/70 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              For Agencies
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white leading-[1.08] tracking-tight mb-5">
              Run AI visibility for{" "}
              <span className="text-[#60A5FA]">every client</span> from one account.
            </h2>
            <p className="text-base text-white/60 leading-relaxed mb-10">
              One login. Multiple client businesses. Separate scans, analytics and reports per client. White-label delivery with your agency branding.
            </p>

            <div className="flex flex-col gap-6 mb-10">
              {AGENCY_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">{label}</p>
                    <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#1d4ed8] transition-colors text-sm"
            >
              Explore Agency Solutions
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Business switcher mock */}
          <div>
            <div
              className="bg-[#1E293B] rounded-2xl border border-white/10 overflow-hidden"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}
            >
              <div className="px-5 py-3.5 border-b border-white/10">
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/30 mb-2">Your Businesses</p>
                <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between border border-white/10">
                  <span className="text-sm font-semibold text-white">Client A — autoshop.com</span>
                  <ChevronRight size={14} className="text-white/30" />
                </div>
              </div>

              <div className="p-2">
                {[
                  { name: "Client A — autoshop.com", score: "42%", delta: "+8", active: true },
                  { name: "Client B — dentist.com", score: "61%", delta: "+3", active: false },
                  { name: "Client C — lawfirm.com", score: "28%", delta: "+14", active: false },
                  { name: "Client D — plumber.com", score: "19%", delta: "+2", active: false },
                ].map(({ name, score, delta, active }) => (
                  <div key={name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${active ? "bg-[#2563EB]/20" : "hover:bg-white/5"}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${active ? "bg-[#2563EB] text-white" : "bg-white/10 text-white/40"}`}>
                      {name[0]}
                    </div>
                    <span className="text-xs font-medium text-white/70 flex-1 truncate">{name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-white/60">{score}</span>
                      <span className="text-[10px] font-bold text-emerald-400">{delta}</span>
                    </div>
                  </div>
                ))}
                <div className="mt-1 border-t border-white/10 pt-2 px-3 py-2 flex items-center gap-2 opacity-60">
                  <div className="w-7 h-7 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
                    <span className="text-white/40 text-base leading-none">+</span>
                  </div>
                  <span className="text-xs text-white/40">Add client business</span>
                </div>
              </div>

              <div className="border-t border-white/10 px-5 py-3 flex items-center justify-between">
                <span className="text-[10px] text-white/30">4 businesses · Agency plan</span>
                <span className="text-[10px] font-semibold text-[#60A5FA]">White-label enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 7: Final CTA ─────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="bg-white py-20 sm:py-28 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <SectionLabel>Get Started Free</SectionLabel>
        <H2 className="mb-5">
          Find out if AI is sending customers to you —{" "}
          <span className="text-[#2563EB]">or your competitors</span>.
        </H2>
        <p className="text-base text-[#475569] leading-relaxed mb-10 max-w-xl mx-auto">
          Run your first AI visibility scan in under 2 minutes. See your Direct Score, which AI platforms mention you, and where competitors are winning.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#1d4ed8] transition-colors text-base shadow-lg shadow-blue-500/25"
          >
            Check My AI Visibility — Free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/ai-employee"
            className="inline-flex items-center gap-2 border border-gray-200 text-[#0F172A] font-semibold px-8 py-4 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-base"
          >
            Meet Your AI Employee
          </Link>
        </div>
        <p className="text-xs text-[#94A3B8]">
          No credit card required for your first scan · Join businesses already tracking their AI visibility
        </p>
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────

export default function HomepagePlatform() {
  return (
    <>
      <HeroSection />
      <TheShiftSection />
      <PlatformProductsSection />
      <AISearchFeatureSection />
      <TheLoopSection />
      <AgencySection />
      <FinalCTASection />
    </>
  );
}
