"use client";

import { useState, useRef } from "react";

// ─── Brand SVG icons (inline — no extra dependency) ──────────────────────────

function MetaLogo({ className }: { className?: string }) {
  // Official Meta infinity-M wordmark shape, simplified to a clean SVG
  return (
    <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Meta">
      {/* Meta blue infinity-loop M */}
      <path
        d="M10 42 C10 28 18 18 28 18 C36 18 42 24 50 35 C58 24 65 16 76 16 C90 16 100 28 100 42 C100 52 94 58 86 58 C78 58 72 52 64 40 C58 50 52 58 40 58 C22 58 10 52 10 42 Z"
        fill="#0082FB"
      />
      <path
        d="M100 42 C100 28 108 18 118 18 C126 18 132 24 140 35 C148 24 155 16 166 16 C180 16 190 28 190 42 C190 52 184 58 176 58 C168 58 162 52 154 40 C148 50 142 58 130 58 C112 58 100 52 100 42 Z"
        fill="#0082FB"
        opacity="0.7"
      />
    </svg>
  );
}

function MetaWordmark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Meta">
      <text x="0" y="26" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="28" fill="#0082FB">meta</text>
    </svg>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  // Messenger chat-bubble with lightning-bolt — accurate brand shape
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Messenger">
      <defs>
        <linearGradient id="msg-grad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A033FF" />
          <stop offset="50%" stopColor="#0099FF" />
          <stop offset="100%" stopColor="#00C2FF" />
        </linearGradient>
      </defs>
      {/* Rounded speech bubble */}
      <path
        d="M28 4C14.75 4 4 14.07 4 26.5c0 6.55 2.8 12.42 7.3 16.6V52l8.86-4.87C22.57 47.7 25.23 48 28 48c13.25 0 24-10.07 24-21.5S41.25 4 28 4Z"
        fill="url(#msg-grad)"
      />
      {/* Lightning bolt */}
      <path
        d="M22 31l8-14v9h5l-8 14v-9h-5Z"
        fill="white"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Instagram">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="56" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="20%" stopColor="#FCAF45" />
          <stop offset="40%" stopColor="#F77737" />
          <stop offset="60%" stopColor="#F56040" />
          <stop offset="80%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#ig-grad)" />
      {/* Camera body outline */}
      <rect x="15" y="15" width="26" height="26" rx="7" fill="none" stroke="white" strokeWidth="2.5" />
      {/* Lens */}
      <circle cx="28" cy="28" r="7.5" fill="none" stroke="white" strokeWidth="2.5" />
      {/* Flash dot */}
      <circle cx="38" cy="18" r="2" fill="white" />
    </svg>
  );
}

// ─── Accordion data ───────────────────────────────────────────────────────────

const ACCORDION_STATS = [
  {
    number: "62% MORE LEADS",
    detail:
      "Meta reports businesses using Meta Business Messaging generated 62% more leads on average compared with legacy solutions.",
    source: "https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging",
    sourceLabel: "Meta: Lead Ads with Messaging",
  },
  {
    number: "71%",
    detail:
      "of online adults said they would like to directly message a business immediately after clicking a social media ad for that business.",
    source: "https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging",
    sourceLabel: "Meta: Lead Ads with Messaging",
  },
  {
    number: "1 BILLION",
    detail: "people message a business every week across Meta platforms.",
    source: "https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging",
    sourceLabel: "Meta: Lead Ads with Messaging",
  },
  {
    number: "600 MILLION",
    detail:
      "conversations happen between people and businesses every day across Meta technologies.",
    source: "https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging",
    sourceLabel: "Meta: Lead Ads with Messaging",
  },
  {
    number: "31% LOWER COST PER LEAD",
    detail:
      "Meta reports that ads that click to Messenger optimized for leads experienced 31% lower cost per lead compared with campaigns optimized for conversations.",
    source: "https://www.facebook.com/business/help/575610661605746",
    sourceLabel: "Meta Business Help",
  },
];

// ─── Flow pills (reusable) ────────────────────────────────────────────────────

function FlowPills({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 flex-nowrap">
      {["AD", "DM", "CONVERSATION"].map((label, i) => (
        <div key={label} className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`rounded-xl border-2 border-[#0F172A] bg-white ${
              small ? "px-4 py-2" : "px-5 sm:px-7 py-3"
            }`}
          >
            <span
              className={`font-black tracking-wider text-[#0F172A] ${
                small ? "text-xs" : "text-sm sm:text-base"
              }`}
            >
              {label}
            </span>
          </div>
          {i < 2 && (
            <svg
              className={`shrink-0 text-[#2563EB] ${small ? "w-4 h-4" : "w-5 h-5 sm:w-6 sm:h-6"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function WhyDMsSection() {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <section className="bg-white py-24 px-4 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">

        {/* ══ 2-col hero ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center mb-20">

          {/* Left — headline + flow */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#2563EB] mb-6">
              Why DMs?
            </p>

            <h2 className="text-6xl sm:text-7xl md:text-8xl font-black text-[#0F172A] leading-none tracking-tight mb-6">
              62%<br />MORE<br />LEADS
            </h2>

            <p className="text-base md:text-lg text-[#475569] leading-relaxed mb-10 max-w-lg">
              Businesses using Meta Business Messaging generated{" "}
              <strong className="text-[#0F172A]">62% more leads on average</strong>{" "}
              compared with legacy solutions.*
            </p>

            <FlowPills />
          </div>

          {/* Right — Meta brand visual */}
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-[#F8FAFC] px-10 py-12 flex flex-col items-center gap-7"
              style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>

              {/* Meta label + logo */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Powered by</span>
                {/* Official Meta logo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Meta-Logo.png"
                  alt="Meta"
                  className="h-40 w-auto object-contain"
                />
              </div>

              {/* Down arrow */}
              <svg className="w-5 h-5 text-[#CBD5E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-6-6m6 6l6-6" />
              </svg>

              {/* Messenger — 2× larger with looping notification bubbles */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <MessengerIcon className="w-32 h-32" />

                  {/* Animated notification bubbles */}
                  {[
                    { num: 1, style: { top: "-6px", right: "-6px" },       delay: "0s",    dur: "2.4s" },
                    { num: 3, style: { top: "-6px", right: "-6px" },       delay: "0.8s",  dur: "2.4s" },
                    { num: 7, style: { top: "-6px", right: "-6px" },       delay: "1.6s",  dur: "2.4s" },
                  ].map(({ num, style, delay, dur }) => (
                    <span
                      key={`${num}-${delay}`}
                      className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-black border-2 border-white"
                      style={{
                        ...style,
                      width: 56,
                      height: 56,
                      fontSize: 20,
                        animation: `notifPop ${dur} ${delay} ease-in-out infinite`,
                        opacity: 0,
                      }}
                    >
                      {num}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Messenger</span>
              </div>

              <style>{`
                @keyframes notifPop {
                  0%   { opacity: 0; transform: scale(0.4); }
                  12%  { opacity: 1; transform: scale(1.15); }
                  20%  { opacity: 1; transform: scale(1); }
                  55%  { opacity: 1; transform: scale(1); }
                  70%  { opacity: 0; transform: scale(0.7); }
                  100% { opacity: 0; transform: scale(0.4); }
                }
              `}</style>

              {/* Down arrow */}
              <svg className="w-5 h-5 text-[#CBD5E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-6-6m6 6l6-6" />
              </svg>

              {/* CONVERSATIONS label */}
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-6 py-3 shadow-sm">
                <svg className="w-5 h-5 text-[#2563EB]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                <span className="text-sm font-black uppercase tracking-widest text-[#0F172A]">Conversations</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ Accordion ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>

          {/* Trigger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="w-full flex items-center justify-between px-8 py-6 bg-white hover:bg-[#F8FAFC] transition-colors text-left"
          >
            <span className="text-base sm:text-lg font-black uppercase tracking-widest text-[#0F172A]">
              See the Meta Messaging Data
            </span>
            <span
              className="w-9 h-9 rounded-full border-2 border-[#0F172A] flex items-center justify-center shrink-0 transition-transform duration-300"
              style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
            >
              <svg className="w-4 h-4 text-[#0F172A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
              </svg>
            </span>
          </button>

          {/* Body — CSS-driven smooth open */}
          <div
            ref={bodyRef}
            style={{
              display: "grid",
              gridTemplateRows: open ? "1fr" : "0fr",
              transition: "grid-template-rows 0.4s ease",
            }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-gray-100 divide-y divide-gray-100">

                {/* Stat rows */}
                {ACCORDION_STATS.map(({ number, detail, source, sourceLabel }) => (
                  <div key={number} className="px-8 py-8 bg-white">
                    <p className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-3 leading-none">
                      {number}
                    </p>
                    <p className="text-base md:text-lg text-[#475569] leading-relaxed mb-3 max-w-2xl">
                      {detail}
                    </p>
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#94A3B8] underline underline-offset-2 hover:text-[#2563EB] transition-colors"
                    >
                      {sourceLabel} ↗
                    </a>
                  </div>
                ))}

                {/* Why This Matters footer */}
                <div className="px-8 py-10 bg-[#F8FAFC]">
                  <p className="text-xs font-black uppercase tracking-widest text-[#2563EB] mb-4">
                    Why This Matters
                  </p>
                  <p className="text-base md:text-lg text-[#475569] leading-relaxed max-w-2xl mb-8">
                    Ads that click to message can send prospects directly into conversations with businesses through Messenger, Instagram or WhatsApp.
                  </p>

                  <FlowPills small />

                  {/* Source links */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">
                      Source: Meta for Business
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap">
                      <a
                        href="https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2563EB] underline underline-offset-2 hover:text-[#1d4ed8] transition-colors"
                      >
                        Lead Ads with Messaging ↗
                      </a>
                      <a
                        href="https://www.facebook.com/business/ads/click-to-message-ads"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2563EB] underline underline-offset-2 hover:text-[#1d4ed8] transition-colors"
                      >
                        Click-to-Message Ads ↗
                      </a>
                      <a
                        href="https://www.facebook.com/business/help/575610661605746"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2563EB] underline underline-offset-2 hover:text-[#1d4ed8] transition-colors"
                      >
                        Cost Per Lead Research ↗
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
