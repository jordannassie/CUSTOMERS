"use client";

import { Check, PhoneCall } from "lucide-react";

const INCLUDES = [
  "24/7 AI call answering",
  "Custom business configuration",
  "Lead qualification",
  "Appointment booking",
  "Customer text messaging",
  "Lead summaries after every call",
  "Multilingual support",
  "Ongoing AI tuning",
  "Customers Direct support",
];

export default function AIPricingSection() {
  return (
    <section id="pricing" className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow + Headline */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight mb-4">
            One AI Employee. One monthly price.
          </h2>
        </div>

        {/* Pricing card */}
        <div className="max-w-md mx-auto">
          <div
            className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 relative overflow-hidden"
            style={{ boxShadow: "0 8px 40px rgba(37,99,235,0.12)" }}
          >
            {/* Top accent */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
              style={{ background: "linear-gradient(90deg, #2563EB 0%, #7C3AED 100%)" }}
              aria-hidden="true"
            />

            {/* Plan label */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-[#64748B]">
                AI Employee
              </span>
              <span className="bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            {/* Price */}
            <div className="mb-1">
              <p className="text-xs font-medium text-[#94A3B8]">
                Comparable agency price
              </p>
              <div className="text-[#94A3B8] line-through decoration-2">
                <span className="text-3xl font-bold">$1,497</span>
                <span className="text-sm font-medium ml-1">/month</span>
              </div>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black text-[#0F172A]">$997</span>
              <span className="text-[#64748B] text-base mb-1.5 font-medium">/month</span>
            </div>
            <p className="text-sm text-[#64748B] mb-8 leading-relaxed">
              Your AI Employee, configured and managed for your business.
            </p>

            {/* Includes */}
            <div className="flex flex-col gap-3 mb-8">
              {INCLUDES.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0">
                    <Check size={11} className="text-[#2563EB]" aria-hidden="true" />
                  </div>
                  <span className="text-sm text-[#64748B]">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
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
              className="flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              <PhoneCall size={16} aria-hidden="true" />
              Build My AI Employee
            </a>

            <p className="text-center text-xs text-[#94A3B8] mt-4">
              No long-term commitment required.
            </p>
          </div>

          {/* Note */}
          <p className="text-center text-xs text-[#94A3B8] mt-6 leading-relaxed">
            Advanced integrations and custom workflows may require a custom plan.
          </p>
        </div>
      </div>
    </section>
  );
}
