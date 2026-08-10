"use client";

import { useState } from "react";

// ─── Cost matrix data ─────────────────────────────────────────────────────────

const ROWS = [
  {
    adSpend: "$1,500",
    daily: "$50/day",
    service: "$2,500",
    total: "$4,000/mo",
    dms: "150–300",
    recommended: false,
  },
  {
    adSpend: "$2,500",
    daily: "$83/day",
    service: "$2,500",
    total: "$5,000/mo",
    dms: "250–500",
    recommended: true,
  },
  {
    adSpend: "$5,000",
    daily: "$167/day",
    service: "$2,500",
    total: "$7,500/mo",
    dms: "500–1,000",
    recommended: false,
  },
  {
    adSpend: "$10,000",
    daily: "$333/day",
    service: "$2,500",
    total: "$12,500/mo",
    dms: "1,000–2,000",
    recommended: false,
  },
];

const COLS = [
  { key: "adSpend", label: "Meta Ad Spend" },
  { key: "daily",   label: "Daily Ad Spend" },
  { key: "service", label: "Our Service" },
  { key: "total",   label: "Total Investment" },
  {
    key: "dms", label: (
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-[#2563EB] shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        Est. Customer DMs
      </span>
    )
  },
];

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PricingSection() {
  const [matrixOpen, setMatrixOpen] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="pricing" className="gradient-bg py-20 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">

        {/* ══ COST MATRIX ══════════════════════════════════════════════════════ */}
        <div>
          {/* Heading */}
          <div className="text-center mb-10">

            {/* Social proof faces */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex -space-x-3">
                {[
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces&auto=format",
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=faces&auto=format",
                ].map((src, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={src}
                    alt="Customer"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white"
                    style={{ zIndex: 12 - i }}
                  />
                ))}
                {/* +more bubble */}
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#2563EB] border-2 border-white flex items-center justify-center text-white text-xs font-black"
                  style={{ zIndex: 0 }}
                >
                  +
                </div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] mb-3">
              See your complete customer-acquisition cost.
            </h2>
            <p className="text-base md:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto mb-6">
              Our service stays at $2,500 per month. Choose how much you want to invest directly into Meta advertising.
            </p>

            {/* Toggle button */}
            <button
              onClick={() => setMatrixOpen(v => !v)}
              aria-expanded={matrixOpen}
              className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-semibold text-sm px-5 py-2.5 rounded-full transition-colors shadow-sm"
            >
              <span>{matrixOpen ? "Hide cost breakdown" : "See cost breakdown"}</span>
              <svg
                className="w-4 h-4 text-[#2563EB] transition-transform duration-300"
                style={{ transform: matrixOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* ── Collapsible table + footnotes + CTA ── */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: matrixOpen ? "1fr" : "0fr",
              transition: "grid-template-rows 0.4s ease",
            }}
          >
          <div className="overflow-hidden">

          {/* ── Desktop table (md+) ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-6 py-4 text-xs font-bold text-[#64748B] uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.adSpend}
                    className={`border-b last:border-b-0 transition-colors ${
                      row.recommended
                        ? "bg-[#EFF6FF] border-b border-blue-100"
                        : "hover:bg-gray-50"
                    }`}
                    style={row.recommended ? { outline: "2px solid #BFDBFE", outlineOffset: "-1px" } : {}}
                  >
                    {/* Meta Ad Spend */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base text-[#0F172A]">{row.adSpend}</span>
                        {row.recommended && (
                          <span className="bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Daily */}
                    <td className="px-6 py-5 text-[#64748B] font-medium">{row.daily}</td>
                    {/* Our Service — always $2,500 */}
                    <td className="px-6 py-5">
                      <span className="font-bold text-[#2563EB]">{row.service}</span>
                    </td>
                    {/* Total Investment */}
                    <td className="px-6 py-5">
                      <span className="font-black text-lg text-[#0F172A]">{row.total}</span>
                    </td>
                    {/* Est. DMs */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5">
                        <svg className={`w-4 h-4 shrink-0 ${row.recommended ? "text-[#2563EB]" : "text-[#64748B]"}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                        <span className={`font-black text-lg ${row.recommended ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                          {row.dms}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5 pl-5">conversations/mo*</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards (below md) ── */}
          {/* Recommended first, then rest */}
          <div className="md:hidden flex flex-col gap-4 mb-4">
            {[...ROWS].sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)).map((row) => (
              <div
                key={row.adSpend}
                className={`rounded-2xl border p-5 ${
                  row.recommended
                    ? "bg-[#EFF6FF] border-[#BFDBFE] shadow-md"
                    : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xl text-[#0F172A]">{row.adSpend}</span>
                    <span className="text-sm text-[#64748B]">Meta ad spend</span>
                  </div>
                  {row.recommended && (
                    <span className="bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Daily ad spend</div>
                    <div className="font-semibold text-[#0F172A]">{row.daily}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Our service</div>
                    <div className="font-bold text-[#2563EB]">{row.service}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Total investment</div>
                    <div className="font-black text-lg text-[#0F172A]">{row.total}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#2563EB]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                      </svg>
                      Est. customer DMs*
                    </div>
                    <div className={`font-black text-lg ${row.recommended ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                      {row.dms}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footnotes */}
          <div className="flex flex-col gap-1.5 mb-8">
            <p className="text-sm text-[#64748B]">
              Meta ad spend is paid separately and directly to Meta.
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-3xl">
              * DM estimates are based on a typical $5–$10 cost per customer conversation.
              Results vary by industry, market, offer and campaign performance. Results are not guaranteed.
            </p>
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <button
              onClick={() => scrollTo("strategy-call")}
              className="bg-[#2563EB] text-white font-bold px-10 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base shadow-lg hover:shadow-xl"
            >
              Book a Strategy Call
            </button>
          </div>
          </div>{/* end overflow-hidden */}
          </div>{/* end grid collapse */}
        </div>

        {/* ══ TWO PRICING CARDS ════════════════════════════════════════════════ */}
        <div>
          {/* Section heading */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left — Text */}
            <div className="lg:pt-10">
              <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] mb-4">
                Simple, transparent pricing.
              </h2>
              <p className="text-lg text-[#64748B] leading-relaxed">
                High-performing video ads. Real conversations. More customers.
              </p>
            </div>

            {/* Right — Two cards */}
            <div className="flex flex-col sm:flex-row gap-5 items-stretch">

              {/* ── Growth (primary / most popular) ── */}
              <div className="relative flex-1 bg-white rounded-2xl shadow-xl p-8 border-2 border-[#2563EB]">
                {/* Most Popular badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow whitespace-nowrap">
                    Most Popular
                  </span>
                </div>

                <p className="text-base font-black text-[#0F172A] mb-2 mt-2">Growth</p>
                <div className="mb-1">
                  <span className="text-4xl font-black text-[#0F172A]">$2,500</span>
                  <span className="text-base font-semibold text-[#64748B] ml-1">/ month</span>
                </div>
                <p className="text-sm text-[#64748B] mb-5">Ad spend paid separately.</p>

                <hr className="border-gray-100 mb-5" />

                <ul className="flex flex-col gap-3 mb-8">
                  {[
                    "Video ad creation",
                    "Meta campaign management",
                    "Leads sent directly to your Instagram DMs",
                    "Ongoing campaign optimization",
                    "1 business / offer",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[#0F172A]">{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => scrollTo("strategy-call")}
                  className="w-full bg-[#2563EB] text-white font-bold py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base shadow-lg"
                >
                  Book a Strategy Call
                </button>
              </div>

              {/* ── Scale (secondary) ── */}
              <div className="flex-1 bg-white rounded-2xl shadow-md p-8 border border-gray-100">
                <p className="text-base font-black text-[#0F172A] mb-2 mt-2">Scale</p>
                <div className="mb-1">
                  <span className="text-4xl font-black text-[#0F172A]">$5,000</span>
                  <span className="text-base font-semibold text-[#64748B] ml-1">/ month</span>
                </div>
                <p className="text-sm text-[#64748B] mb-5">Ad spend paid separately.</p>

                <hr className="border-gray-100 mb-5" />

                <ul className="flex flex-col gap-3 mb-8">
                  {[
                    "Everything in Growth",
                    "Multiple campaigns / offers",
                    "Multiple locations or markets",
                    "More ad creative testing",
                    "Higher-volume campaign management",
                    "Priority optimization",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#F8FAFC] flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[#0F172A]">{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => scrollTo("strategy-call")}
                  className="w-full bg-[#0F172A] text-white font-bold py-4 rounded-full hover:bg-[#1e293b] transition-colors text-base"
                >
                  Book a Strategy Call
                </button>
              </div>

            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-sm text-[#94A3B8] mt-8 max-w-2xl mx-auto leading-relaxed">
            Ad spend is paid separately. Start with a budget that makes sense for your business and scale as results improve.
          </p>
        </div>

      </div>
    </section>
  );
}
