"use client";

import { useState, FormEvent } from "react";
import { Search, Clock, Calendar, AlertCircle, ArrowRight, Info } from "lucide-react";

interface ReportData {
  businessName: string;
  hours: string;
  afterHoursWindow: string;
  weekendCoverage: string;
}

function mockReport(website: string): ReportData {
  const domain = website
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  const name = domain
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    businessName: name || "Your Business",
    hours: "Mon–Fri  8:00 AM – 5:00 PM",
    afterHoursWindow: "16 hours / day",
    weekendCoverage: "Limited",
  };
}

export default function BusinessAvailabilityScanner() {
  const [website, setWebsite] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!website.trim()) return;
    setLoading(true);
    // Simulate a brief "check" delay before showing the demo report
    setTimeout(() => {
      setReport(mockReport(website.trim()));
      setLoading(false);
    }, 1200);
  }

  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-tight mb-4">
            How Available Is Your Business?
          </h2>
          <p className="text-base text-[#64748B] leading-relaxed max-w-xl mx-auto">
            Enter your website and see where customers may be reaching you
            when no one is available to answer.
          </p>
        </div>

        {/* Input card */}
        <div
          className="bg-white rounded-3xl border border-gray-100 p-8"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="yourbusiness.com"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !website.trim()}
              className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1d4ed8] transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Checking…
                </>
              ) : (
                <>
                  <Search size={14} aria-hidden="true" />
                  Check My Business
                </>
              )}
            </button>
          </form>

          {/* Preview disclaimer */}
          <div className="flex items-center gap-2 mt-4 text-[11px] text-[#94A3B8]">
            <Info size={12} aria-hidden="true" />
            <span>
              Preview analysis. Live business data integration coming soon.
            </span>
          </div>

          {/* Report */}
          {report && (
            <div
              className="mt-8 rounded-2xl border border-[#DBEAFE] overflow-hidden"
              style={{ animation: "popIn 0.4s ease forwards" }}
            >
              {/* Report header */}
              <div className="bg-[#EFF6FF] px-6 py-4 border-b border-[#DBEAFE] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] mb-0.5">
                    Business Availability Report
                  </p>
                  <p className="font-bold text-[#0F172A]">{report.businessName}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                  <AlertCircle size={10} aria-hidden="true" />
                  Review Recommended
                </div>
              </div>

              {/* Report rows */}
              <div className="divide-y divide-gray-50 bg-white">
                {[
                  {
                    icon: Calendar,
                    label: "Business Hours",
                    value: report.hours,
                    sub: "Standard weekday coverage",
                  },
                  {
                    icon: Clock,
                    label: "After-Hours Window",
                    value: report.afterHoursWindow,
                    sub: "Calls outside office hours",
                    warn: true,
                  },
                  {
                    icon: Calendar,
                    label: "Weekend Coverage",
                    value: report.weekendCoverage,
                    sub: "Saturday and Sunday availability",
                    warn: true,
                  },
                ].map(({ icon: Icon, label, value, sub, warn }) => (
                  <div key={label} className="flex items-center gap-4 px-6 py-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        warn
                          ? "bg-amber-50 border border-amber-100"
                          : "bg-[#EFF6FF] border border-[#DBEAFE]"
                      }`}
                    >
                      <Icon
                        size={16}
                        className={warn ? "text-amber-600" : "text-[#2563EB]"}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#64748B]">{label}</p>
                      <p className="font-semibold text-[#0F172A] text-sm">{value}</p>
                    </div>
                    <p className="text-xs text-[#94A3B8] hidden sm:block text-right">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Risk summary */}
              <div className="bg-amber-50 border-t border-amber-100 px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-1">
                  Potential Customer Risk
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  Customers can call outside your normal business hours, while
                  you&apos;re busy, or when your team is already helping someone
                  else. Every unanswered call is an opportunity that may move
                  to a competitor.
                </p>
              </div>

              {/* CTA */}
              <div className="bg-white px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a
                  href="#demo"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("demo");
                    if (el) {
                      const y =
                        el.getBoundingClientRect().top + window.scrollY - 88;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
                >
                  See How AI Phone Helps
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Preview analysis based on typical business patterns. Live business
                  data integration coming soon.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
