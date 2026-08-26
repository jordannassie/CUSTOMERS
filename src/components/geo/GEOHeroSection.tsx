"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function GEOHeroSection() {
  return (
    <section className="relative overflow-hidden gradient-bg pt-16 pb-20 sm:pt-24 sm:pb-28 px-4">
      <div
        className="pointer-events-none absolute -top-32 right-0 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-20 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #2563EB, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto relative text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm text-xs font-bold text-[#7C3AED] px-4 py-2 rounded-full mb-8">
          <Sparkles size={13} aria-hidden="true" />
          AI Search Visibility, Measured
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-bold text-[#171717] leading-[1.05] tracking-tight mb-6">
          Customers.Direct helps AI
          <br className="hidden sm:block" />
          send customers{" "}
          <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
            directly to your business
          </span>
          .
        </h1>

        <p className="text-lg sm:text-xl text-[#777773] max-w-2xl mx-auto leading-relaxed mb-10">
          Buyers now ask ChatGPT, Claude, Perplexity, and Google AI Overviews before they
          ever open a search results page. We measure whether your business shows up in
          those answers, diagnose why or why not, and help you fix it.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#171717] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2A2A2A] transition-colors text-base shadow-lg shadow-blue-500/20"
          >
            Check My AI Visibility — Free
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#171717] font-semibold px-8 py-4 rounded-full hover:border-gray-300 transition-colors text-base"
          >
            See How It Works
          </a>
        </div>

        <p className="text-xs text-[#A3A3A0]">
          Takes about 2 minutes. No credit card required to see your first scan.
        </p>
      </div>

      {/* Product loop strip */}
      <div className="max-w-4xl mx-auto mt-16 relative">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg px-6 py-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
          {["Measure", "Diagnose", "Recommend", "Execute", "Measure Again"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#171717] whitespace-nowrap">
                {step}
              </span>
              {i < arr.length - 1 && (
                <ArrowRight size={14} className="text-[#CBD5E1]" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
