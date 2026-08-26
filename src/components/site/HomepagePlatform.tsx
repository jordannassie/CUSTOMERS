"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  BarChart3,
  MessagesSquare,
  Users,
  Lightbulb,
  Link2,
  Bot,
  FileBarChart,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  Target,
  Quote,
  Trophy,
} from "lucide-react";

// ─── Dashboard preview mock ────────────────────────────────────────────────

const SCORE_POINTS = [38, 42, 44, 48, 54, 62, 68, 74, 78, 82];

function LargeTrendChart() {
  const w = 300;
  const h = 100;
  const pad = 4;
  const max = 100;
  const pts = SCORE_POINTS.map((v, i) => {
    const x = pad + (i / (SCORE_POINTS.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return { x, y };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${linePath} L ${pts[pts.length - 1].x} ${h - pad} L ${pts[0].x} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#heroArea)" />
      <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#2563EB" />
      ))}
    </svg>
  );
}

const OPPORTUNITIES = [
  { label: "Low AI mention rate", impact: "HIGH IMPACT", color: "text-[#DC2626] bg-[#FEF2F2]" },
  { label: "Missing in 6 buyer prompts", impact: "Medium", color: "text-[#B45309] bg-[#FFFBEB]" },
  { label: "Outrank competitors", impact: "Medium", color: "text-[#B45309] bg-[#FFFBEB]" },
];

const MOCK_METRICS = [
  { label: "DIRECT SCORE", value: "82", sub: "out of 100", trend: "+12", up: true, icon: Target },
  { label: "PROMPTS WON", value: "10 / 12", sub: "mentioned by AI", trend: "+3", up: true, icon: Trophy },
  { label: "CITATION RATE", value: "64%", sub: "responses citing your site", trend: "+18%", up: true, icon: Quote },
];

const SIDE_NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Prompts", icon: MessagesSquare, active: false },
  { label: "Competitors", icon: Users, active: false },
  { label: "Opportunities", icon: Lightbulb, active: false },
  { label: "Citations", icon: Link2, active: false },
];

function DashboardPreview() {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full"
      style={{ boxShadow: "0 32px 80px rgba(15,23,42,0.14), 0 4px 20px rgba(15,23,42,0.06)" }}
    >
      <div className="flex h-[380px]">
        {/* Sidebar */}
        <div className="w-[130px] shrink-0 border-r border-slate-100 bg-white flex flex-col py-3">
          <div className="px-3 mb-4">
            <span className="text-[#0F172A] font-black text-[11px] tracking-tight">
              Customers<span className="text-[#2563EB]">.Direct</span>
            </span>
          </div>
          <div className="px-3 mb-2">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Your businesses
            </p>
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-md px-2 py-1.5">
              <div className="w-3 h-3 rounded bg-amber-100 text-amber-600 text-[7px] font-black flex items-center justify-center shrink-0">
                1
              </div>
              <span className="text-[10px] font-semibold text-[#0F172A] truncate">1Billion.org</span>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-2 flex-1">
            {SIDE_NAV.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium ${
                  active ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#64748B]"
                }`}
              >
                <Icon size={10} />
                {label}
              </div>
            ))}
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 bg-[#F8FAFC] p-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[12px] font-bold text-[#0F172A]">Overview</p>
              <p className="text-[9px] text-[#94A3B8]">1Billion.org · Dallas, Texas</p>
            </div>
            <button className="flex items-center gap-1 bg-[#2563EB] text-white text-[9px] font-bold px-2.5 py-1.5 rounded-md">
              <RefreshCw size={8} />
              Run New Scan
            </button>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {MOCK_METRICS.map(({ label, value, sub, trend, up }) => (
              <div key={label} className="bg-white rounded-lg border border-slate-200 p-2.5">
                <p className="text-[7px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[14px] font-black text-[#0F172A] leading-none">{value}</p>
                <p className="text-[7px] text-[#94A3B8] mt-0.5">{sub}</p>
                <span className={`text-[8px] font-bold ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {up ? "↑" : "↓"} {trend}
                </span>
              </div>
            ))}
          </div>

          {/* Two-column bottom */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold text-[#0F172A]">Direct Score trend</p>
                <span className="text-[7px] text-[#94A3B8]">Last 7 scans</span>
              </div>
              <LargeTrendChart />
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2.5">
              <p className="text-[9px] font-bold text-[#0F172A] mb-2">Top opportunities</p>
              <div className="flex flex-col gap-1.5">
                {OPPORTUNITIES.map(({ label, impact, color }) => (
                  <div key={label} className="flex items-center justify-between gap-1.5">
                    <span className="text-[8px] text-[#475569] leading-tight flex-1">{label}</span>
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${color}`}>
                      {impact}
                    </span>
                  </div>
                ))}
                <button className="text-[8px] text-[#2563EB] font-semibold mt-1 text-left">
                  View all opportunities →
                </button>
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: "Tracked Prompts", value: "25", trend: "+4", up: true },
              { label: "Competitors Tracked", value: "5", trend: "No change", up: null },
              { label: "Open Opportunities", value: "3", trend: "+2", up: true },
            ].map(({ label, value, trend, up }) => (
              <div key={label} className="bg-white rounded-lg border border-slate-200 px-2.5 py-2">
                <p className="text-[11px] font-black text-[#0F172A]">{value}</p>
                <p className="text-[7px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
                {up !== null && (
                  <span className={`text-[7px] font-bold ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {up ? "↑" : ""} {trend}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product showcase tabs ──────────────────────────────────────────────────

const SHOWCASE_TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    headline: "See your AI visibility at a glance",
    body: "Track your Direct Score, monitor prompt performance, and spot opportunities that drive real impact.",
    bullets: [
      "Real-time Direct Score tracking",
      "Trend analysis across scans",
      "Prioritized opportunities",
    ],
  },
  {
    id: "prompts",
    label: "Prompts",
    icon: MessagesSquare,
    headline: "Know exactly which prompts you win — and which you lose",
    body: "See which buyer-intent questions your business answers well, and which ones competitors dominate.",
    bullets: [
      "Per-prompt visibility scoring",
      "Won / lost breakdown by provider",
      "Smart prompt suggestions",
    ],
  },
  {
    id: "competitors",
    label: "Competitors",
    icon: Users,
    headline: "Outmaneuver competitors in AI results",
    body: "See exactly which prompts competitors win, which AI providers favor them, and what to do about it.",
    bullets: [
      "Head-to-head prompt comparison",
      "Provider-by-provider breakdown",
      "Gap → Opportunity conversion",
    ],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    icon: Lightbulb,
    headline: "Turn gaps into wins with actionable guidance",
    body: "Each opportunity includes evidence, impact, recommended action, and a ready-made prompt for Claude.",
    bullets: [
      "Evidence-backed recommendations",
      "Copy prompt for Claude in one click",
      "High / medium / low prioritization",
    ],
  },
  {
    id: "citations",
    label: "Citations",
    icon: Link2,
    headline: "Understand which sources AI trusts",
    body: "See which domains AI cites when answering prompts about your industry — and where you're missing.",
    bullets: [
      "Per-source citation counts",
      "Competitor citation comparison",
      "Gap analysis and source recommendations",
    ],
  },
  {
    id: "direct-agent",
    label: "Direct Agent",
    icon: Bot,
    headline: "Ask anything about your AI visibility",
    body: "The Direct Agent is grounded in your real visibility data. It separates evidence from inference.",
    bullets: [
      "Answers grounded in your real data",
      "Evidence vs. inference labeling",
      "Instant strategic guidance",
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileBarChart,
    headline: "Track progress and share with clients",
    body: "A complete record of every scan and how your Direct Score has moved over time.",
    bullets: [
      "Scan history and score timeline",
      "Opportunity status tracking",
      "Export-ready for agencies",
    ],
  },
] as const;

type ShowcaseTab = (typeof SHOWCASE_TABS)[number]["id"];

// ─── Sections ───────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="bg-[#F1F5F9] px-4 py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-1.5 mb-6">
            <BarChart3 size={13} className="text-[#7C3AED]" />
            <span className="text-[12px] font-semibold text-[#475569]">AI Search Visibility, Measured</span>
          </div>

          <h1 className="text-[40px] sm:text-[52px] lg:text-[56px] font-black text-[#0F172A] leading-[1.04] tracking-tight mb-5">
            AI sends customers{" "}
            <span className="text-[#2563EB]">directly</span>
            {" "}to your business.
          </h1>

          <p className="text-[17px] text-[#475569] leading-relaxed mb-8 max-w-[480px]">
            Buyers ask AI first. We measure whether your business shows up in those answers,
            diagnose why (or why not), and show you exactly how to fix it.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-5 py-3 rounded-lg hover:bg-[#1d4ed8] transition-colors text-[15px]"
            >
              Check My AI Visibility — Free
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 bg-white text-[#0F172A] font-semibold px-5 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-[15px]"
            >
              See How It Works
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {[
              "No credit card required",
              "Takes 2 minutes",
              "Free visibility score",
            ].map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B]">
                <Check size={13} className="text-[#2563EB] shrink-0" />
                {s}
              </span>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-3">
              Trusted by forward-thinking companies
            </p>
            <div className="flex flex-wrap items-center gap-5">
              {["1Billion.org", "Trailpeak", "NEXORA", "BluePeak", "VeloWorks"].map((name) => (
                <span key={name} className="text-[13px] font-semibold text-[#94A3B8]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right — dashboard preview */}
        <div className="relative lg:pl-4">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function ProductShowcaseSection() {
  const [active, setActive] = useState<ShowcaseTab>("overview");
  const tab = SHOWCASE_TABS.find((t) => t.id === active) ?? SHOWCASE_TABS[0];

  return (
    <section className="bg-white py-16 sm:py-20 px-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-[36px] font-black text-[#0F172A] leading-tight mb-3">
            Everything you need to win in AI search
          </h2>
          <p className="text-[16px] text-[#64748B] max-w-xl mx-auto">
            From measuring visibility to taking action — Customers.Direct gives you the complete platform.
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 mb-10">
          {SHOWCASE_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                active === id
                  ? "border-[#2563EB] text-[#2563EB]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content — 2 column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#EFF6FF] text-[#2563EB] rounded-full px-3 py-1 mb-4">
              <tab.icon size={12} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A] mb-4 leading-tight">
              {tab.headline}
            </h3>
            <p className="text-[16px] text-[#64748B] leading-relaxed mb-6">{tab.body}</p>
            <ul className="flex flex-col gap-2.5 mb-8">
              {tab.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-[14px] text-[#475569]">
                  <Check size={14} className="text-[#2563EB] shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
            >
              Try it free <ArrowRight size={13} />
            </Link>
          </div>

          {/* Right: mock preview */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-5 min-h-[260px] flex items-center justify-center">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyItMattersSection() {
  const pillars = [
    {
      icon: BarChart3,
      title: "Be discovered where buyers search",
      body: "Get mentioned in AI answers across ChatGPT, Claude, Perplexity, and Google AI Overviews.",
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
    {
      icon: TrendingUp,
      title: "Turn visibility into customers",
      body: "AI sends high-intent buyers directly to you — before they ever see search results.",
      color: "#2563EB",
      bg: "#EFF6FF",
    },
    {
      icon: Users,
      title: "Outrank your competitors",
      body: "See where competitors show up and you don't, and outrank them in the answers that matter.",
      color: "#059669",
      bg: "#ECFDF5",
    },
  ];

  return (
    <section className="bg-[#F8FAFC] py-16 sm:py-20 px-4 border-t border-slate-200">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#94A3B8] mb-3">
            Why it matters
          </p>
          <h2 className="text-3xl sm:text-[38px] font-black text-[#0F172A] leading-tight">
            AI answers. Real impact.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {pillars.map(({ icon: Icon, title, body, color, bg }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: bg }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="text-[16px] font-bold text-[#0F172A] mb-2">{title}</h3>
              <p className="text-[14px] text-[#64748B] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="bg-[#0F172A] py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Start measuring your AI visibility today.
        </h2>
        <p className="text-[16px] text-slate-400 mb-8">
          Free visibility score. No credit card required. Takes under 2 minutes.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-lg hover:bg-[#1d4ed8] transition-colors text-[15px]"
          >
            Check My AI Visibility — Free
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/ai-search"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-semibold text-[15px] transition-colors"
          >
            Learn about AI Search Visibility
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function HomepagePlatform() {
  return (
    <>
      <HeroSection />
      <ProductShowcaseSection />
      <WhyItMattersSection />
      <FinalCTASection />
    </>
  );
}
