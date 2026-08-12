"use client";

import { Check, PhoneCall, ArrowRight } from "lucide-react";
import LiveCallCard from "./LiveCallCard";

export default function AIHeroSection() {
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  return (
    <section className="bg-white pt-12 pb-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* LEFT — Copy */}
        <div>
          <div className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-full px-4 py-1.5 mb-6">
            <PhoneCall size={13} className="text-[#2563EB]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">
              AI Receptionist for Your Business
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-[#0F172A] leading-[1.08] tracking-tight mb-6">
            Never Miss Another{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
              }}
            >
              Customer Call.
            </span>
          </h1>

          <p className="text-lg text-[#64748B] leading-relaxed mb-8 max-w-md">
            Your AI Receptionist answers 24/7, qualifies callers, books
            appointments, and sends you the lead — automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button
              onClick={() => scrollTo("demo")}
              className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-7 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              <PhoneCall size={17} aria-hidden="true" />
              Hear Your AI Receptionist
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-[#0F172A] font-semibold px-7 py-4 rounded-full hover:bg-gray-50 transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              See How It Works
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {[
              "24/7 Call Answering",
              "Keep Your Existing Number",
              "Built Around Your Business",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0">
                  <Check size={11} className="text-[#2563EB]" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-[#64748B]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Animated Phone UI */}
        <div className="flex justify-center lg:justify-end pt-8 pb-12 lg:py-0">
          <LiveCallCard />
        </div>
      </div>
    </section>
  );
}
