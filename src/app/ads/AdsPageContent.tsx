"use client";

import React, { useState, Suspense } from "react";
import { ArrowRight, CheckCircle2, Map, PenLine, Settings, TrendingUp, BarChart3 } from "lucide-react";
import ContactForm from "@/components/site/ContactForm";

// ─── Sourced stats ────────────────────────────────────────────────────────────

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

// ─── What's included ──────────────────────────────────────────────────────────

const INCLUDED: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <Map      size={16} className="text-[#0866F5]" />,
    title: "Campaign strategy",
    desc:  "Based on your business, target customers, and goals.",
  },
  {
    icon: <PenLine  size={16} className="text-[#0866F5]" />,
    title: "Ad copy and creative preparation",
    desc:  "Written and prepared for supported ChatGPT ad formats.",
  },
  {
    icon: <Settings size={16} className="text-[#0866F5]" />,
    title: "Campaign setup",
    desc:  "Account configuration and campaign launch in your eligible advertising account.",
  },
  {
    icon: <TrendingUp size={16} className="text-[#0866F5]" />,
    title: "Ongoing management and optimization",
    desc:  "Regular review and adjustments to campaign targeting and performance.",
  },
  {
    icon: <BarChart3 size={16} className="text-[#0866F5]" />,
    title: "Monthly performance reporting",
    desc:  "Using available platform metrics so you understand what's happening.",
  },
];

// ─── Image URLs ───────────────────────────────────────────────────────────────

const IMG_HERO_AD =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/ads/813b9870-504d-4fce-bc77-738f8cb3e0fa.png";
const IMG_ADS_MANAGER =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/ads/e63d32f7-4280-4e66-a371-3b4a6226857b.png";
const IMG_CHAT =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/ads/Chat.png";

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`Full-size view: ${alt}`}
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="2" y1="2" x2="16" y2="16"/><line x1="16" y1="2" x2="2" y2="16"/>
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdsPageContent() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

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
              We create and manage ChatGPT ad campaigns to help your business reach people exploring products and services like yours.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 bg-[#0866F5] text-white font-bold text-[15px] px-6 py-3.5 rounded-xl hover:bg-[#0755D4] transition-colors active:scale-[0.98] shadow-sm"
              >
                Get Started
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>

            <p className="text-[13px] text-[#A3A3A0]">$1,000/month · Ad spend separate</p>

            <p className="text-[12px] text-[#A3A3A0] mt-4">
              Paid ads are separate from ChatGPT&apos;s organic answers.
            </p>
          </div>

          {/* Right — ChatGPT Ad Example image */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[520px]">
              <p className="text-center text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-widest mb-3">
                ChatGPT Ad Example
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMG_HERO_AD}
                alt="Example of a sponsored ChatGPT ad card showing a local restaurant"
                width={1448}
                height={1086}
                className="w-full h-auto rounded-2xl border border-[#E5E5E1] shadow-xl shadow-black/5"
                loading="eager"
              />
              <p className="text-center text-[10.5px] text-[#A3A3A0] mt-2 leading-relaxed">
                For illustration. Actual ad formats and placement are determined by the ChatGPT platform.
              </p>
            </div>
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

      {/* ── What's included + Ads Manager ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left — service cards */}
          <div>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#171717] mb-2">
              What $1,000/month includes
            </h2>
            <p className="text-[15px] text-[#777773] mb-8">
              Our service fee covers strategy, setup, and management.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {INCLUDED.map((item) => (
                <div
                  key={item.title}
                  className="bg-white border border-[#E5E5E1] rounded-2xl px-5 py-4 flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-[#171717] mb-0.5">{item.title}</p>
                    <p className="text-[12.5px] text-[#777773] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#F5F5F2] border border-[#E5E5E1] rounded-xl px-5 py-4 text-[12.5px] text-[#777773] leading-relaxed">
              $1,000/month is our service fee. Your advertising budget is separate and paid through your advertising account. Campaign launch is subject to account eligibility, supported markets, and ad approval.
            </div>
          </div>

          {/* Right — Ads Manager image */}
          <div className="lg:sticky lg:top-28">
            <p className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-widest mb-3">
              Ads Manager
            </p>
            <button
              type="button"
              onClick={() => setLightbox({ src: IMG_ADS_MANAGER, alt: "OpenAI Ads Manager dashboard showing campaign overview" })}
              className="w-full group cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] rounded-2xl"
              aria-label="View Ads Manager image full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMG_ADS_MANAGER}
                alt="OpenAI Ads Manager dashboard showing campaign overview with ad creatives, impressions, clicks, and CPC metrics"
                width={1563}
                height={1006}
                loading="lazy"
                className="w-full h-auto rounded-2xl border border-[#E5E5E1] shadow-lg shadow-black/5 group-hover:shadow-xl group-hover:shadow-black/8 transition-shadow"
              />
            </button>
            <p className="text-[10.5px] text-[#A3A3A0] mt-2 text-center leading-relaxed">
              Illustrative dashboard. Figures shown are not actual client results.
            </p>
            <p className="text-[10.5px] text-[#A3A3A0] mt-0.5 text-center">Tap to enlarge</p>
          </div>
        </div>
      </section>

      {/* ── Chat.png section ──────────────────────────────────────────────── */}
      <section className="border-y border-[#E5E5E1] bg-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#171717] mb-3">
              Your customers are already searching on ChatGPT.
            </h2>
            <p className="text-[15px] text-[#777773]">
              Be there when they do.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLightbox({ src: IMG_CHAT, alt: "ChatGPT search interface showing a local business ad" })}
            className="w-full group cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] rounded-2xl"
            aria-label="View ChatGPT search example full size"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG_CHAT}
              alt="ChatGPT search interface with the query 'Best Mexican food in Austin' showing a sponsored ad for Casa Sol Mexican Kitchen"
              width={1935}
              height={813}
              loading="lazy"
              className="w-full h-auto rounded-2xl border border-[#E5E5E1] shadow-xl shadow-black/5 group-hover:shadow-2xl group-hover:shadow-black/8 transition-shadow"
            />
          </button>
          <p className="text-[10.5px] text-[#A3A3A0] mt-3 text-center leading-relaxed">
            Example ad placement in ChatGPT. For illustration only — not actual client results.
          </p>
        </div>
      </section>

      {/* ── Contact form ──────────────────────────────────────────────────── */}
      <section id="contact" className="bg-[#FAFAF8] py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#171717] mb-3 flex items-center justify-center gap-3">
              Get started with
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ai-platforms/chatgpt.svg" alt="ChatGPT" width={32} height={32} className="inline-block opacity-90 shrink-0" />
              ChatGPT Ads
            </h2>
            <p className="text-[15px] text-[#777773]">
              Tell us about your business and we&apos;ll reach out to discuss your campaign.
            </p>
          </div>

          <Suspense fallback={<div className="bg-white border border-[#E5E5E1] rounded-2xl p-8 h-[520px] animate-pulse" />}>
            <ContactForm initialInterest="chatgpt_ads" source="ads_page" />
          </Suspense>

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

          <p className="text-[11.5px] text-[#A3A3A0] text-center mt-8">
            Customers.Direct is an independent service provider and is not affiliated with or endorsed by OpenAI.
          </p>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

    </main>
  );
}
