"use client";

import { PhoneCall, Calendar } from "lucide-react";

export default function AIFinalCTA() {
  return (
    <section className="bg-[#0F172A] py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block text-xs font-black uppercase tracking-widest text-white/40 mb-6">
          Stop Losing Customers to Missed Calls.
        </span>

        <h2 className="text-3xl sm:text-4xl lg:text-[52px] font-black text-white leading-tight mb-4">
          Your next customer is going to call someone.
        </h2>
        <p className="text-2xl sm:text-3xl font-black mb-10"
          style={{ color: "#2563EB" }}>
          Make sure you answer.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("demo");
              if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 88;
                window.scrollTo({ top: y, behavior: "smooth" });
              }
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <PhoneCall size={17} aria-hidden="true" />
            Hear Your AI Employee
          </a>
          <a
            href="https://calendar.app.google/muM2Kqc8oYnWBPXXA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Calendar size={17} aria-hidden="true" />
            Book a Strategy Call
          </a>
        </div>
      </div>
    </section>
  );
}
