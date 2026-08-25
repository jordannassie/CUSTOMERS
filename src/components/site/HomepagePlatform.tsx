"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BarChart3,
  MessageCircle,
  PhoneIncoming,
  Sparkles,
  Check,
} from "lucide-react";

const PRODUCTS = [
  {
    phase: "Get Found",
    label: "AI Search Visibility",
    description:
      "Measure and improve whether ChatGPT, Claude, Perplexity, and Google AI Overviews recommend your business to buyers who are actively looking.",
    href: "/ai-search",
    icon: BarChart3,
    accent: "#7C3AED",
    bg: "#F5F3FF",
    border: "#EDE9FE",
    cta: "Check My AI Visibility →",
    highlights: [
      "Real buyer-intent prompts, real evidence",
      "Direct Score + competitor comparison",
      "Diagnose why AI does or doesn't mention you",
    ],
  },
  {
    phase: "Get Answered",
    label: "AI Employee",
    description:
      "Every call gets answered. Your AI Employee works alongside your staff, keeps your existing number, and handles after-hours and overflow calls.",
    href: "/ai-employee",
    icon: Bot,
    accent: "#2563EB",
    bg: "#EFF6FF",
    border: "#DBEAFE",
    cta: "Meet Your AI Employee →",
    highlights: [
      "Never miss a customer call again",
      "Qualifies leads and books next steps",
      "Works with your existing phone number",
    ],
  },
  {
    phase: "Get Conversations",
    label: "DM Ads",
    description:
      "Done-for-you direct message advertising that starts real conversations with people who are interested in your business.",
    href: "/dm-ads",
    icon: MessageCircle,
    accent: "#0891B2",
    bg: "#ECFEFF",
    border: "#CFFAFE",
    cta: "Start More Conversations →",
    highlights: [
      "Target the right people at the right time",
      "Start conversations, not just impressions",
      "Managed campaigns that deliver results",
    ],
  },
  {
    phase: "Convert Visitors",
    label: "Call Bar",
    description:
      "A lightweight, one-tap mobile Call Bar turns website visitors into phone calls — free to build and embed on any site.",
    href: "/call-bar",
    icon: PhoneIncoming,
    accent: "#059669",
    bg: "#ECFDF5",
    border: "#D1FAE5",
    cta: "Build Your Call Bar →",
    highlights: [
      "One-tap calling from any mobile browser",
      "Free to create and embed",
      "Lightweight — no app required",
    ],
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    number: "01",
    label: "Measure",
    detail: "We run real buyer-intent prompts across every major AI platform and record whether your business appears.",
  },
  {
    number: "02",
    label: "Diagnose",
    detail: "We identify exactly where you are losing visibility and explain why — competitor gaps, content gaps, citation gaps.",
  },
  {
    number: "03",
    label: "Execute",
    detail: "Implement fixes through the Direct Agent workflow. We handle calls, conversations, and conversions in parallel.",
  },
  {
    number: "04",
    label: "Measure Again",
    detail: "Track your Direct Score over time. See which changes moved the needle and where to go next.",
  },
];

export default function HomepagePlatform() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden gradient-bg pt-16 pb-24 sm:pt-24 sm:pb-32 px-4">
        {/* Ambient glows */}
        <div
          className="pointer-events-none absolute -top-24 right-0 w-[560px] h-[560px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 w-[480px] h-[480px] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #2563EB, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto relative text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm text-xs font-bold text-[#7C3AED] px-4 py-2 rounded-full mb-8">
            <Sparkles size={12} aria-hidden="true" />
            AI-powered customer acquisition platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-black text-[#0F172A] leading-[1.05] tracking-tight mb-6">
            Customers.Direct helps AI
            <br className="hidden sm:block" />
            send customers{" "}
            <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
              directly to your business
            </span>
            .
          </h1>

          <p className="text-lg sm:text-xl text-[#64748B] max-w-2xl mx-auto leading-relaxed mb-10">
            Businesses are won or lost before a customer ever reaches your website.
            Customers.Direct makes sure AI recommends you, your phones are answered,
            conversations start, and visitors become customers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base shadow-lg shadow-blue-500/20"
            >
              Check My AI Visibility — Free
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#0F172A] font-semibold px-8 py-4 rounded-full hover:border-gray-300 transition-colors text-base"
            >
              See How It Works
            </Link>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Takes about 2 minutes · No credit card required for your first scan
          </p>
        </div>

        {/* Platform loop strip */}
        <div className="max-w-3xl mx-auto mt-16 relative">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md px-6 py-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
            {["Measure", "Diagnose", "Recommend", "Execute", "Measure Again"].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#0F172A] whitespace-nowrap">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowRight
                      size={13}
                      className="text-[#CBD5E1]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Platform Products ──────────────────────────────────────── */}
      <section className="bg-white py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
              The Platform
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0F172A] leading-tight mb-4">
              One platform.{" "}
              <span className="text-[#2563EB]">Every step of the journey.</span>
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              From the moment a buyer asks an AI a question, to the moment they become your
              customer — Customers.Direct owns that path.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {PRODUCTS.map(
              ({ phase, label, description, href, icon: Icon, accent, bg, border, cta, highlights }) => (
                <div
                  key={href}
                  className="rounded-3xl border p-8 flex flex-col hover:shadow-lg transition-shadow duration-200"
                  style={{ borderColor: border, backgroundColor: "#FAFAFA" }}
                >
                  {/* Phase tag */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                    >
                      <Icon size={18} style={{ color: accent }} aria-hidden="true" />
                    </div>
                    <div>
                      <span
                        className="block text-xs font-black uppercase tracking-widest"
                        style={{ color: accent }}
                      >
                        {phase}
                      </span>
                      <span className="block text-base font-black text-[#0F172A] mt-0.5">
                        {label}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[#64748B] leading-relaxed mb-5">
                    {description}
                  </p>

                  <ul className="flex flex-col gap-2 mb-6 flex-1">
                    {highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                        >
                          <Check size={9} style={{ color: accent }} aria-hidden="true" />
                        </div>
                        <span className="text-sm text-[#475569]">{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors"
                    style={{ color: accent }}
                  >
                    {cta}
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── How It Works Preview ───────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#F8FAFC] py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0F172A] leading-tight mb-4">
              Detect. Explain. Fix. Measure.
            </h2>
            <p className="text-lg text-[#64748B] max-w-xl mx-auto leading-relaxed">
              A systematic approach to making sure AI sends customers to you — not your competitors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map(({ number, label, detail }) => (
              <div
                key={number}
                className="bg-white rounded-2xl border border-gray-100 p-6"
                style={{ boxShadow: "0 4px 16px rgba(15,23,42,0.04)" }}
              >
                <span className="block text-3xl font-black text-[#EFF6FF] mb-3 select-none">
                  {number}
                </span>
                <h3 className="text-base font-black text-[#0F172A] mb-2">{label}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 bg-[#0F172A] text-white font-bold px-7 py-3.5 rounded-full hover:bg-[#1e293b] transition-colors text-sm"
            >
              See the Full Process
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why AI Search Visibility matters ──────────────────────── */}
      <section className="bg-white py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#0F172A] rounded-3xl px-8 py-12 sm:px-12 sm:py-16 text-center"
            style={{ boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-white/80 text-xs font-bold px-4 py-2 rounded-full mb-8">
              <Sparkles size={12} aria-hidden="true" />
              The new front door to your business
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-white leading-tight mb-5">
              Buyers now ask AI before{" "}
              <span className="text-[#60A5FA]">they search</span>.
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
              ChatGPT, Claude, Perplexity, and Google AI Overviews are becoming the first
              place people look for local services, professional recommendations, and product
              comparisons. If you don&apos;t appear in those answers, you don&apos;t exist to those buyers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base shadow-lg shadow-blue-500/30"
              >
                Check My AI Visibility — Free
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href="/ai-search"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/15 transition-colors text-base"
              >
                Learn About AI Search
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
