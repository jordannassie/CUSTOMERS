"use client";

import { Suspense } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import ContactForm from "@/components/site/ContactForm";

// ─── Sourced stats config ─────────────────────────────────────────────────────
// Edit here to update values, labels, and source attribution across the page.

const STATS = [
  {
    value:       "900M+",
    label:       "Weekly active ChatGPT users",
    attribution: "Reported by OpenAI, March 2026",
    sourceUrl:   "https://openai.com/index/accelerating-the-next-phase-ai/",
    sourceName:  "OpenAI",
  },
  {
    value:       "Nearly 3×",
    label:       "Growth in ChatGPT search usage over one year",
    attribution: "Reported by OpenAI, March 2026",
    sourceUrl:   "https://openai.com/index/accelerating-the-next-phase-ai/",
    sourceName:  "OpenAI",
  },
] as const;

// ─── Illustrative ad preview ──────────────────────────────────────────────────

function AdPreview() {
  return (
    <div className="w-full max-w-[460px] mx-auto">
      {/* Label */}
      <p className="text-center text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-widest mb-3">
        Illustrative ad preview
      </p>

      {/* ChatGPT-style interface mock */}
      <div className="bg-white border border-[#E5E5E1] rounded-2xl overflow-hidden shadow-xl shadow-black/5">
        {/* Browser bar */}
        <div className="bg-[#F5F5F2] border-b border-[#E5E5E1] px-4 py-2.5 flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#E5E5E1]" />
            <div className="w-3 h-3 rounded-full bg-[#E5E5E1]" />
            <div className="w-3 h-3 rounded-full bg-[#E5E5E1]" />
          </div>
          <div className="flex-1 bg-white border border-[#E5E5E1] rounded-lg px-3 py-1 flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E1]" />
            <div className="text-[11px] text-[#A3A3A0] truncate">chatgpt.com</div>
          </div>
        </div>

        {/* Chat interface */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-[#F5F5F2] text-[#171717] text-[13px] px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]">
              Best local plumber in Austin
            </div>
          </div>

          {/* AI response */}
          <div className="flex flex-col gap-3">
            <div className="text-[13px] text-[#374151] leading-relaxed">
              Here are some highly rated local options in Austin:
            </div>

            {/* Sponsored placement */}
            <div className="border border-[#0866F5]/20 rounded-xl p-3.5 bg-[#EFF6FF]/50 relative">
              <div className="absolute -top-2.5 left-3">
                <span className="bg-[#0866F5] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Sponsored
                </span>
              </div>
              <div className="flex items-start gap-3 pt-1">
                <div className="w-9 h-9 rounded-xl bg-[#0866F5]/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0866F5" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#171717] leading-tight mb-0.5">
                    Austin Plumbing Co.
                  </p>
                  <p className="text-[11.5px] text-[#6B7280] leading-snug">
                    Licensed & insured · Same-day service · austinplumbing.com
                  </p>
                  <p className="text-[11px] text-[#0866F5] font-semibold mt-1.5">
                    Get a free estimate →
                  </p>
                </div>
              </div>
            </div>

            {/* Organic results */}
            <div className="flex flex-col gap-1.5">
              {["Top Plumbers Austin — 4.8★ · 200+ reviews", "Austin Pro Plumbing — 4.7★ · same-day"].map((item) => (
                <div key={item} className="text-[12px] text-[#374151] flex items-start gap-1.5">
                  <span className="text-[#A3A3A0] mt-0.5 shrink-0">•</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10.5px] text-[#A3A3A0] mt-3 leading-relaxed max-w-sm mx-auto">
        For illustration only. Actual ad formats, placement, and availability are determined by the ChatGPT platform.
      </p>
    </div>
  );
}

// ─── What's included cards ────────────────────────────────────────────────────

const INCLUDED: { icon: string; title: string; desc: string }[] = [
  {
    icon: "🗺️",
    title: "Campaign strategy",
    desc: "Based on your business, target customers, and goals.",
  },
  {
    icon: "✏️",
    title: "Ad copy and creative preparation",
    desc: "Written and prepared for supported ChatGPT ad formats.",
  },
  {
    icon: "⚙️",
    title: "Campaign setup",
    desc: "Account configuration and campaign launch in your eligible advertising account.",
  },
  {
    icon: "📈",
    title: "Ongoing management and optimization",
    desc: "Regular review and adjustments to campaign targeting and performance.",
  },
  {
    icon: "📋",
    title: "Monthly performance reporting",
    desc: "Using available platform metrics so you understand what's happening.",
  },
];


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdsPageContent() {
  return (
    <main className="bg-[#FAFAF8] min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#0866F5] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ai-platforms/chatgpt.svg" alt="" aria-hidden="true" width={12} height={12} className="opacity-80" />
              ChatGPT Ads Management
            </div>

            <h1 className="text-[38px] sm:text-[52px] font-bold text-[#171717] leading-[1.05] tracking-tight mb-5">
              Get your business discovered on ChatGPT.
            </h1>
            <p className="text-[17px] text-[#555550] leading-relaxed mb-8">
              We create and manage ChatGPT ad campaigns so your business can reach people as they explore products, services, and their next purchase.
            </p>

            {/* Pricing pill */}
            <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white border border-[#E5E5E1] rounded-2xl px-5 py-4 mb-8 shadow-sm">
              <div>
                <p className="text-[24px] font-bold text-[#171717] leading-none">$1,000<span className="text-[16px] font-semibold text-[#777773]">/month</span></p>
                <p className="text-[12.5px] text-[#777773] mt-0.5">Ad creation + campaign management</p>
              </div>
              <div className="hidden sm:block h-8 w-px bg-[#E5E5E1]" />
              <p className="text-[12px] text-[#A3A3A0]">Advertising spend is separate.</p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 bg-[#0866F5] text-white font-bold text-[15px] px-6 py-3.5 rounded-xl hover:bg-[#0755D4] transition-colors active:scale-[0.98] shadow-sm"
              >
                Get Started
                <ArrowRight size={15} aria-hidden="true" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#171717] font-semibold text-[15px] px-6 py-3.5 rounded-xl border border-[#E5E5E1] hover:border-[#C5C5C0] transition-colors active:scale-[0.98]"
              >
                Talk to Us
              </a>
            </div>
          </div>

          {/* Right — ad preview */}
          <div className="flex items-center justify-center">
            <AdPreview />
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-y border-[#E5E5E1] bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#171717] text-center mb-3">
            A growing place for customers to discover businesses.
          </h2>
          <p className="text-center text-[14px] text-[#A3A3A0] mb-12">
            Figures below are publicly reported by OpenAI. Not all ChatGPT users see ads or are reachable by every campaign.
          </p>

          <div className="grid sm:grid-cols-2 gap-8">
            {STATS.map((stat) => (
              <div
                key={stat.value}
                className="bg-[#FAFAF8] border border-[#E5E5E1] rounded-2xl p-7 text-center"
              >
                <p className="text-[48px] sm:text-[56px] font-bold text-[#0866F5] leading-none mb-2">
                  {stat.value}
                </p>
                <p className="text-[15px] font-semibold text-[#171717] mb-3">{stat.label}</p>
                <a
                  href={stat.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-[#A3A3A0] hover:text-[#0866F5] transition-colors underline underline-offset-2"
                >
                  {stat.attribution} · {stat.sourceName}
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <path d="M7 1h4v4l-1-1-4 4-1-1 4-4-2-2zm-5 2h3v1H3v6h6V7h1v4H2V3z"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#171717] mb-3">
            What $1,000/month includes
          </h2>
          <p className="text-[15px] text-[#777773]">
            Our service fee covers strategy, setup, and management.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {INCLUDED.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E5E5E1] rounded-2xl p-5 flex items-start gap-3.5"
            >
              <span className="text-[24px] shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-[13.5px] font-bold text-[#171717] mb-1">{item.title}</p>
                <p className="text-[12.5px] text-[#777773] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclosure */}
        <div className="bg-[#F5F5F2] border border-[#E5E5E1] rounded-xl px-5 py-4 text-[12.5px] text-[#777773] leading-relaxed">
          $1,000/month is our service fee. Your advertising budget is separate and paid through your advertising account. Campaign launch is subject to account eligibility, supported markets, and ad approval.
        </div>
      </section>

      {/* ── Contact form ──────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="border-t border-[#E5E5E1] bg-white py-16 sm:py-20"
      >
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#171717] mb-3">
              Get started with ChatGPT Ads
            </h2>
            <p className="text-[15px] text-[#777773]">
              Tell us about your business and we&apos;ll reach out to discuss your campaign.
            </p>
          </div>

          <Suspense fallback={<div className="bg-white border border-[#E5E5E1] rounded-2xl p-8 h-[520px] animate-pulse" />}>
            <ContactForm
              initialInterest="chatgpt_ads"
              source="ads_page"
            />
          </Suspense>

          {/* What to expect */}
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              "No commitment required to inquire.",
              "We confirm eligibility and match your goals.",
              "You own your account and ad spend.",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#0866F5] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#777773] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
