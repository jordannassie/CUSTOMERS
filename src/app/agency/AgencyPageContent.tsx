"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  CheckCheck,
  Building2,
  BarChart3,
  TrendingUp,
  FileText,
  Lightbulb,
  Shield,
  Users,
  Search,
  Target,
  RefreshCw,
  ChevronRight,
  Zap,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const REVENUE_ROWS = [
  { clients: 5,   low: "$1,495",  mid: "$2,495",  high: "$3,750"  },
  { clients: 10,  low: "$2,990",  mid: "$4,990",  high: "$7,500"  },
  { clients: 25,  low: "$7,475",  mid: "$12,475", high: "$18,750" },
  { clients: 50,  low: "$14,950", mid: "$24,950", high: "$37,500" },
  { clients: 100, low: "$29,900", mid: "$49,900", high: "$75,000" },
];

const CLIENT_EMAIL =
  `We're now monitoring how your business appears across AI platforms like ChatGPT, Claude and Perplexity.\n\nWe found that AI is already recommending businesses in your category — and in some searches, competitors may be appearing ahead of you.\n\nWe've added AI Visibility monitoring so we can track this, identify opportunities and improve how your brand appears in AI-powered search.`;

const WHAT_YOU_CAN_SELL = [
  {
    icon: BarChart3,
    color: "bg-blue-500",
    shadow: "shadow-blue-200",
    label: "AI Visibility Monitoring",
    desc: "Track how often your clients appear across AI platforms.",
  },
  {
    icon: Users,
    color: "bg-violet-500",
    shadow: "shadow-violet-200",
    label: "Competitor Tracking",
    desc: "Show exactly which competitors are being recommended instead.",
  },
  {
    icon: FileText,
    color: "bg-teal-500",
    shadow: "shadow-teal-200",
    label: "AI Search Reporting",
    desc: "Give clients clear recurring reports showing visibility and changes over time.",
  },
  {
    icon: Lightbulb,
    color: "bg-orange-500",
    shadow: "shadow-orange-200",
    label: "Opportunity Recommendations",
    desc: "Identify what may improve their chances of appearing in AI answers.",
  },
  {
    icon: Target,
    color: "bg-rose-500",
    shadow: "shadow-rose-200",
    label: "AI Search Strategy",
    desc: "Use Customers.Direct insights to create your own strategy and implementation services.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Add Your Client",
    desc: "Add the client's business and key competitors.",
  },
  {
    num: "02",
    title: "Run AI Visibility",
    desc: "Customers.Direct checks how the business appears across supported AI platforms and tracked prompts.",
  },
  {
    num: "03",
    title: "Show The Gap",
    desc: "Show the client exactly where competitors are winning and where opportunities exist.",
  },
  {
    num: "04",
    title: "Sell The Solution",
    desc: "Turn monitoring, reporting, strategy and implementation into a recurring agency service.",
  },
] as const;

const WHY_AGENCIES = [
  { icon: Building2,  label: "Manage multiple client businesses" },
  { icon: Users,      label: "Compare each client against competitors" },
  { icon: BarChart3,  label: "Track AI visibility across models" },
  { icon: RefreshCw,  label: "Monitor changes over time" },
  { icon: Lightbulb,  label: "Surface opportunities" },
  { icon: TrendingUp, label: "Create a new recurring service" },
  { icon: Shield,     label: "Keep the client relationship" },
  { icon: Zap,        label: "Set your own pricing" },
] as const;

// ─── Copy Email Button ────────────────────────────────────────────────────────

function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLIENT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable in non-secure context
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center gap-2 bg-[#171717] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2A2A2A] active:scale-[0.97] transition-all"
    >
      {copied ? <CheckCheck size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {copied ? "Copied!" : "Copy Client Email"}
    </button>
  );
}

// ─── Hero Dashboard Mock ──────────────────────────────────────────────────────

function HeroDashboardMock() {
  const clients = [
    { name: "Sunrise Auto",  score: 42, delta: "+8",  active: true  },
    { name: "Bright Dental", score: 61, delta: "+3",  active: false },
    { name: "Peak Law Firm", score: 28, delta: "+14", active: false },
    { name: "Flow Plumbing", score: 19, delta: "+2",  active: false },
  ];

  const competitors = [
    { name: "Sunrise Auto",    score: 42, yours: true  },
    { name: "Quick Lube Co.",  score: 67, yours: false },
    { name: "City Auto Repair",score: 55, yours: false },
  ];

  return (
    <div
      className="bg-[#1E293B] rounded-2xl border border-white/10 overflow-hidden"
      style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}
      aria-label="Agency dashboard preview"
    >
      {/* Top bar */}
      <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Agency — 4 Clients
        </span>
        <span className="text-[10px] text-emerald-400 font-semibold" aria-hidden="true">
          ● Live
        </span>
      </div>

      {/* Client list */}
      <div className="p-2">
        {clients.map(({ name, score, delta, active }) => (
          <div
            key={name}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              active ? "bg-[#2563EB]/20" : "hover:bg-white/5"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                active ? "bg-[#2563EB]" : "bg-white/10"
              }`}
            >
              <span className="text-[10px] font-black text-white">{name[0]}</span>
            </div>
            <span className="text-xs font-medium text-white/65 flex-1 truncate">{name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${active ? "bg-[#2563EB]" : "bg-white/25"}`}
                  style={{ width: `${score}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-bold text-white/55 w-7 text-right tabular-nums">
                {score}%
              </span>
              <span className="text-[10px] font-bold text-emerald-400 w-6 tabular-nums">
                {delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Competitor comparison */}
      <div className="border-t border-white/8 px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-white/25 mb-3">
          Sunrise Auto — AI Visibility vs. Competitors
        </p>
        {competitors.map(({ name, score, yours }) => (
          <div key={name} className="flex items-center gap-2 mb-2">
            <span
              className={`text-[11px] w-32 truncate ${
                yours ? "text-white font-semibold" : "text-white/45"
              }`}
            >
              {name}
            </span>
            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  yours ? "bg-[#2563EB]" : "bg-white/20"
                }`}
                style={{ width: `${score}%` }}
                aria-hidden="true"
              />
            </div>
            <span
              className={`text-[11px] font-bold w-8 text-right tabular-nums ${
                yours ? "text-white" : "text-white/40"
              }`}
            >
              {score}%
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-white/8 px-5 py-3 flex items-center justify-between">
        <span className="text-[10px] text-white/25">ChatGPT · Claude · Perplexity</span>
        <span className="text-[10px] font-semibold text-[#60A5FA]">Updated today</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencyPageContent() {
  return (
    <div className="bg-[#FAFAF8]">

      {/* ─── 1. Hero ──────────────────────────────────────────────────── */}
      <section className="pt-16 pb-24 sm:pt-20 sm:pb-28 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
                For Agencies
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-[#171717] leading-[1.05] tracking-tight mb-5">
                Grow Your Agency<br />With AI Search
              </h1>

              <p className="text-xl font-semibold text-[#171717] mb-4 leading-snug">
                Add AI Visibility as a recurring service to the clients you already have.
              </p>

              <p className="text-base text-[#777773] leading-relaxed mb-10 max-w-lg">
                See how your clients appear across ChatGPT, Claude, Perplexity and other AI
                platforms, compare them against competitors, and turn those insights into a new
                monthly agency service.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-7 py-3.5 rounded-xl hover:bg-[#1d4ed8] active:scale-[0.97] transition-all shadow-lg shadow-blue-500/25 text-sm whitespace-nowrap"
                >
                  Start 14-Day Free Trial
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <a
                  href="#revenue"
                  className="inline-flex items-center justify-center gap-2 bg-white border border-[#E5E5E1] text-[#171717] font-semibold px-7 py-3.5 rounded-xl hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-all text-sm whitespace-nowrap"
                >
                  See The Revenue Opportunity
                </a>
              </div>

              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                You own the client relationship. You set the price.<br />
                Customers.Direct powers the intelligence.
              </p>
            </div>

            {/* Right: dashboard mock */}
            <div>
              <HeroDashboardMock />
            </div>

          </div>
        </div>
      </section>

      {/* ─── 2. Problem / Opportunity ─────────────────────────────────── */}
      <section className="bg-[#F5F5F2] py-20 sm:py-24 px-4">
        <div className="max-w-[1200px] mx-auto">

          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-5">
              Your Clients Are Already<br />Competing In AI Search
            </h2>
            <p className="text-base text-[#777773] leading-relaxed">
              Customers are increasingly asking AI tools which companies, products and services
              they should choose.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start max-w-4xl mx-auto">

            {/* Problem list */}
            <div className="bg-white rounded-2xl border border-[#E5E5E1] p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <p className="text-sm font-bold text-[#171717] mb-5">
                Most businesses have no idea:
              </p>
              <ul className="flex flex-col gap-3" role="list">
                {[
                  "If ChatGPT recommends them",
                  "Which competitors appear instead",
                  "How often they are mentioned",
                  "Which AI platforms they are winning or losing on",
                  "What they need to improve",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#991B1B] text-[9px] font-black leading-none">✕</span>
                    </div>
                    <span className="text-sm text-[#777773]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Flow visual */}
            <div className="bg-white rounded-2xl border border-[#E5E5E1] p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <p className="text-sm font-bold text-[#171717] mb-5">
                Agency owners can solve this:
              </p>
              <div className="flex flex-col gap-0">
                {[
                  { label: "AI Search",              color: "bg-[#2563EB]",  text: "text-white" },
                  { label: "Client Visibility",       color: "bg-[#7C3AED]",  text: "text-white" },
                  { label: "Competitor Comparison",   color: "bg-[#0891B2]",  text: "text-white" },
                  { label: "Opportunities",           color: "bg-[#059669]",  text: "text-white" },
                  { label: "Monthly Agency Service",  color: "bg-[#171717]",  text: "text-white" },
                ].map(({ label, color, text }, i, arr) => (
                  <div key={label}>
                    <div className={`${color} ${text} text-sm font-semibold px-4 py-3 rounded-xl text-center`}>
                      {label}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-1.5">
                        <ChevronRight
                          size={14}
                          className="text-[#A3A3A0] rotate-90"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 3. Revenue Matrix ────────────────────────────────────────── */}
      <section id="revenue" className="py-20 sm:py-24 px-4 bg-white scroll-mt-24">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              Turn AI Visibility Into Recurring Revenue
            </h2>
            <p className="text-base text-[#777773] max-w-xl mx-auto">
              Customers.Direct gives you the platform. You choose what to charge your clients.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[520px] max-w-3xl mx-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="text-left pb-5 pr-6 text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] w-28"
                    >
                      Active<br />Clients
                    </th>
                    <th scope="col" className="pb-5 px-3 text-center">
                      <div className="bg-[#F5F5F2] rounded-xl px-4 py-3 border border-[#E5E5E1]">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">
                          Per Client
                        </div>
                        <div className="text-lg font-black text-[#171717]">$299<span className="text-sm font-semibold text-[#A3A3A0]">/mo</span></div>
                      </div>
                    </th>
                    <th scope="col" className="pb-5 px-3 text-center relative">
                      <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 border-2 border-[#2563EB] relative">
                        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                          <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full whitespace-nowrap">
                            Sweet Spot
                          </span>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
                          Per Client
                        </div>
                        <div className="text-lg font-black text-[#2563EB]">$499<span className="text-sm font-semibold text-[#2563EB]/60">/mo</span></div>
                      </div>
                    </th>
                    <th scope="col" className="pb-5 px-3 text-center">
                      <div className="bg-[#F5F5F2] rounded-xl px-4 py-3 border border-[#E5E5E1]">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">
                          Per Client
                        </div>
                        <div className="text-lg font-black text-[#171717]">$750<span className="text-sm font-semibold text-[#A3A3A0]">/mo</span></div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE_ROWS.map(({ clients, low, mid, high }, i) => (
                    <tr
                      key={clients}
                      className={i % 2 === 0 ? "bg-[#FAFAF8]" : "bg-white"}
                    >
                      <td className="py-4 pr-6 text-sm font-bold text-[#171717] pl-3 rounded-l-xl">
                        {clients} clients
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="text-sm font-semibold text-[#555552] tabular-nums">
                          {low}/mo
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center bg-[#EFF6FF] border-x border-[#BFDBFE]">
                        <span className="text-sm font-black text-[#2563EB] tabular-nums">
                          {mid}/mo
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center rounded-r-xl">
                        <span className="text-sm font-semibold text-[#555552] tabular-nums">
                          {high}/mo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-[#A3A3A0] mt-6 max-w-md mx-auto leading-relaxed">
            Illustrative agency revenue only. You choose your own pricing, services and packages.
          </p>

        </div>
      </section>

      {/* ─── 4. What You Can Sell ─────────────────────────────────────── */}
      <section className="bg-[#F5F5F2] py-20 sm:py-24 px-4">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              A New Service You Can Offer Every Client
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {WHAT_YOU_CAN_SELL.map(({ icon: Icon, color, shadow, label, desc }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-[#E5E5E1] p-6 hover:shadow-lg transition-shadow"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <div className={`w-10 h-10 rounded-xl ${color} ${shadow} shadow-md flex items-center justify-center mb-4`}>
                  <Icon size={18} className="text-white" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-[#171717] mb-2">{label}</h3>
                <p className="text-sm text-[#777773] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-[#777773] leading-relaxed">
              <span className="font-semibold text-[#171717]">
                Customers.Direct provides the intelligence.
              </span>
              <br />
              Your agency provides the relationship, strategy and implementation.
            </p>
          </div>

        </div>
      </section>

      {/* ─── 5. Package / Pricing Examples ───────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              How Agencies Can Package The Service
            </h2>
            <p className="text-base text-[#777773]">
              Use these as examples or create your own packages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">

            {/* AI Monitor */}
            <div className="rounded-2xl border-2 border-[#E5E5E1] bg-white p-7">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-2">
                Tier 1
              </p>
              <h3 className="text-xl font-black text-[#171717] mb-1">AI Monitor</h3>
              <p className="text-[11px] text-[#A3A3A0] uppercase tracking-wider font-semibold mb-4">
                Suggested client price
              </p>
              <p className="text-3xl font-black text-[#171717] mb-7">
                $299<span className="text-base font-semibold text-[#A3A3A0]">/mo</span>
              </p>
              <ul className="flex flex-col gap-3" role="list">
                {[
                  "AI visibility tracking",
                  "Competitor tracking",
                  "AI platform monitoring",
                  "Monthly reporting",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[#2563EB] shrink-0" aria-hidden="true" />
                    <span className="text-sm text-[#555552]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Growth — Featured */}
            <div className="rounded-2xl border-2 border-[#2563EB] bg-[#EFF6FF] p-7 relative shadow-xl shadow-blue-500/10 -translate-y-2">
              <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-2">
                Tier 2
              </p>
              <h3 className="text-xl font-black text-[#171717] mb-1">AI Growth</h3>
              <p className="text-[11px] text-[#2563EB]/60 uppercase tracking-wider font-semibold mb-4">
                Suggested client price
              </p>
              <p className="text-3xl font-black text-[#2563EB] mb-7">
                $499<span className="text-base font-semibold text-[#2563EB]/60">/mo</span>
              </p>
              <ul className="flex flex-col gap-3" role="list">
                {[
                  "Everything in AI Monitor",
                  "Opportunity recommendations",
                  "Visibility trends",
                  "Competitor movement",
                  "Monthly agency review",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[#2563EB] shrink-0" aria-hidden="true" />
                    <span className="text-sm text-[#171717] font-medium">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Search Management */}
            <div className="rounded-2xl border-2 border-[#E5E5E1] bg-white p-7">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-2">
                Tier 3
              </p>
              <h3 className="text-xl font-black text-[#171717] mb-1">AI Search Management</h3>
              <p className="text-[11px] text-[#A3A3A0] uppercase tracking-wider font-semibold mb-4">
                Suggested client price
              </p>
              <p className="text-3xl font-black text-[#171717] mb-7">
                $999+<span className="text-base font-semibold text-[#A3A3A0]">/mo</span>
              </p>
              <ul className="flex flex-col gap-3" role="list">
                {[
                  "Everything in AI Growth",
                  "Agency strategy",
                  "Content / website recommendations",
                  "Implementation",
                  "Ongoing optimization",
                  "Consulting",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[#171717] shrink-0" aria-hidden="true" />
                    <span className="text-sm text-[#555552]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <p className="text-center text-xs text-[#A3A3A0]">
            Suggested pricing only. Your agency controls what you charge and what services you include.
          </p>

        </div>
      </section>

      {/* ─── 6. How It Works ──────────────────────────────────────────── */}
      <section className="bg-[#F5F5F2] py-20 sm:py-24 px-4">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              How Agencies Use Customers.Direct
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ num, title, desc }) => (
              <div
                key={num}
                className="bg-white rounded-2xl border border-[#E5E5E1] p-6"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="text-4xl font-black mb-4 leading-none"
                  style={{ color: "#E5E5E1" }}
                  aria-hidden="true"
                >
                  {num}
                </div>
                <h3 className="text-sm font-bold text-[#171717] mb-2">{title}</h3>
                <p className="text-sm text-[#777773] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── 7. Sales Enablement ──────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-[1200px] mx-auto">

          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              We Help You Sell It Too
            </h2>
            <p className="text-base text-[#777773] leading-relaxed">
              Use this example to explain AI Visibility monitoring to your clients.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">

            {/* Email card */}
            <div
              className="bg-[#F5F5F2] rounded-2xl border border-[#E5E5E1] p-6 mb-5"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-[#171717] flex items-center justify-center shrink-0">
                  <span className="text-white text-[9px] font-black">✉</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0]">
                  Example client email
                </span>
              </div>
              <blockquote className="text-sm text-[#555552] leading-relaxed whitespace-pre-line">
                {CLIENT_EMAIL}
              </blockquote>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <CopyEmailButton />

              {/* Run Client Scan → /signup (requires authentication) */}
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#DBEAFE] transition-colors"
              >
                <Search size={14} aria-hidden="true" />
                Run Client Scan
              </Link>

              {/* View Sample Report → /compare (closest public demo available) */}
              <Link
                href="/compare"
                className="inline-flex items-center justify-center gap-2 bg-white border border-[#E5E5E1] text-[#777773] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#F5F5F2] transition-colors"
              >
                <FileText size={14} aria-hidden="true" />
                View Sample Report
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 8. Economics Example ─────────────────────────────────────── */}
      <section className="bg-[#0F172A] py-20 sm:py-24 px-4">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight mb-4">
              See The Agency Opportunity
            </h2>
          </div>

          <div className="max-w-sm mx-auto">
            <div
              className="bg-[#1E293B] rounded-2xl border border-white/10 p-8 text-center mb-6"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}
            >
              <div className="flex items-center justify-center gap-3 text-white mb-1 flex-wrap">
                <span className="text-2xl font-black">25 Clients</span>
                <span className="text-white/30 text-xl font-light">×</span>
                <span className="text-2xl font-black">
                  $499<span className="text-base font-semibold text-white/50">/mo</span>
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 my-5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-white/25 text-xs font-semibold">=</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-2">
                Potential Monthly Client Revenue
              </p>
              <p className="text-5xl font-black text-white tabular-nums">$12,475</p>
              <p className="text-sm text-white/35 mt-1">per month</p>
            </div>

            <p className="text-center text-[13px] text-white/35 leading-relaxed">
              Your actual margins depend on your Customers.Direct plan, usage, implementation
              costs and the services your agency provides.
            </p>
          </div>

        </div>
      </section>

      {/* ─── 9. Why Agencies ──────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              Built For Agencies Managing Multiple Brands
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {WHY_AGENCIES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] px-4 py-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-[#2563EB]" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-[#555552]">{label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── 10. Final CTA ────────────────────────────────────────────── */}
      <section className="bg-[#0F172A] py-20 sm:py-28 px-4">
        <div className="max-w-[1200px] mx-auto text-center">

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
            Your Clients Will Ask About AI Search.<br className="hidden sm:block" />
            Be The Agency That Already Has The Answer.
          </h2>

          <p className="text-base text-white/55 leading-relaxed mb-10 max-w-xl mx-auto">
            Start monitoring client visibility, competitor performance and AI search opportunities
            with Customers.Direct.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0866F5] font-bold px-8 py-4 rounded-xl hover:bg-blue-50 active:scale-[0.97] transition-all shadow-lg text-sm whitespace-nowrap"
            >
              Start 14-Day Free Trial
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/8 border border-white/15 text-white/80 font-semibold px-8 py-4 rounded-xl hover:bg-white/12 hover:text-white transition-all text-sm whitespace-nowrap"
            >
              Sign In
            </Link>
          </div>

          <p className="text-xs text-white/25">
            Built for agencies, brands and businesses competing for visibility in AI search.
          </p>

        </div>
      </section>

    </div>
  );
}
