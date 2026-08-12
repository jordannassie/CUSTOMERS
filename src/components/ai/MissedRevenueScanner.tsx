"use client";

import { useState, FormEvent } from "react";
import { Search, Clock, Calendar, TrendingUp, Info, ArrowRight } from "lucide-react";

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
    hours: "Mon–Fri  ·  8:00 AM – 5:00 PM",
    afterHoursWindow: "16 hours / day",
    weekendCoverage: "Limited",
  };
}

function fmtDollars(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

export default function MissedRevenueScanner() {
  const [website, setWebsite] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Adjustable assumptions
  const [missedCalls, setMissedCalls] = useState(8);
  const [avgValue, setAvgValue] = useState(750);
  const [closeRate, setCloseRate] = useState(30);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!website.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setReport(mockReport(website.trim()));
      setLoading(false);
    }, 1200);
  }

  // Revenue range calculation
  const monthlyMissed = missedCalls * 4.33;
  const base = monthlyMissed * avgValue * (closeRate / 100);
  const lowRev = Math.round(base * 0.7);
  const highRev = Math.round(base * 1.3);

  // Customer opportunity range
  const baseCust = monthlyMissed * (closeRate / 100);
  const lowCust = Math.max(1, Math.round(baseCust * 0.7));
  const highCust = Math.max(1, Math.round(baseCust * 1.3));

  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-tight mb-4">
            How Much Could Your Business Be Missing?
          </h2>
          <p className="text-base text-[#64748B] leading-relaxed max-w-xl mx-auto">
            Enter your website and estimate the revenue opportunities you could
            be losing when calls go unanswered.
          </p>
        </div>

        {/* Input card */}
        <div
          className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8"
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
                  Calculating…
                </>
              ) : (
                <>
                  <Search size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">
                    Calculate My Missed Revenue
                  </span>
                  <span className="sm:hidden">Check My Revenue</span>
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

          {/* ── REPORT ── */}
          {report && (
            <div
              className="mt-8 rounded-2xl border border-[#DBEAFE] overflow-hidden"
              style={{ animation: "popIn 0.4s ease forwards" }}
            >
              {/* Report header */}
              <div className="bg-[#EFF6FF] px-6 py-4 border-b border-[#DBEAFE] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] mb-0.5">
                    Customer Opportunity Report
                  </p>
                  <p className="font-bold text-[#0F172A]">
                    {report.businessName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0">
                  <TrendingUp size={10} aria-hidden="true" />
                  Missed Call Exposure
                </div>
              </div>

              {/* Business info rows */}
              <div className="divide-y divide-gray-50 bg-white">
                {[
                  {
                    icon: Calendar,
                    label: "Business Hours",
                    value: report.hours,
                    sub: "Standard weekday coverage",
                    warn: false,
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
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#64748B]">{label}</p>
                      <p className="font-semibold text-[#0F172A] text-sm">
                        {value}
                      </p>
                    </div>
                    <p className="text-xs text-[#94A3B8] hidden sm:block text-right shrink-0">
                      {sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── ADJUSTABLE ASSUMPTIONS ── */}
              <div className="bg-[#F8FAFC] border-t border-gray-100 px-6 py-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-5">
                  Adjust Your Assumptions
                </p>
                <div className="flex flex-col gap-6">
                  {/* Missed calls per week */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-[#0F172A]">
                        Estimated Missed Calls / Week
                      </label>
                      <span className="text-sm font-black text-[#2563EB] tabular-nums">
                        {missedCalls}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={missedCalls}
                      onChange={(e) => setMissedCalls(Number(e.target.value))}
                      className="w-full accent-[#2563EB] h-2 cursor-pointer"
                      aria-label="Estimated missed calls per week"
                    />
                    <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                      <span>1</span>
                      <span>50</span>
                    </div>
                  </div>

                  {/* Average customer value */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-[#0F172A]">
                        Average Customer Value
                      </label>
                      <span className="text-sm font-black text-[#2563EB] tabular-nums">
                        ${avgValue.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={10000}
                      step={50}
                      value={avgValue}
                      onChange={(e) => setAvgValue(Number(e.target.value))}
                      className="w-full accent-[#2563EB] h-2 cursor-pointer"
                      aria-label="Average customer value in dollars"
                    />
                    <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                      <span>$100</span>
                      <span>$10,000</span>
                    </div>
                  </div>

                  {/* Close rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-[#0F172A]">
                        Estimated Close Rate
                      </label>
                      <span className="text-sm font-black text-[#2563EB] tabular-nums">
                        {closeRate}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={closeRate}
                      onChange={(e) => setCloseRate(Number(e.target.value))}
                      className="w-full accent-[#2563EB] h-2 cursor-pointer"
                      aria-label="Estimated close rate percentage"
                    />
                    <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                      <span>5%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── REVENUE HERO ── */}
              <div
                className="px-6 py-10 text-center"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-4">
                  Potential Revenue Opportunity
                </p>
                <p className="text-4xl sm:text-5xl font-black text-white leading-none">
                  {fmtDollars(lowRev)} – {fmtDollars(highRev)}
                  <span className="text-xl font-bold text-white/60">/mo</span>
                </p>
                <p className="text-sm text-white/70 mt-4 max-w-xs mx-auto leading-relaxed">
                  potential monthly revenue that could be at risk when new
                  customer calls go unanswered
                </p>

                <div className="mt-6 inline-block bg-white/10 border border-white/20 rounded-2xl px-8 py-5">
                  <p className="text-3xl sm:text-4xl font-black text-white leading-none tabular-nums">
                    {lowCust}–{highCust}
                  </p>
                  <p className="text-xs text-white/70 mt-2">
                    Potential Customer Opportunities / Month
                  </p>
                </div>
              </div>

              {/* ── WHY THIS MATTERS ── */}
              <div className="bg-[#F8FAFC] border-t border-gray-100 px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-2">
                  Why This Matters
                </p>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Customers may call while you&apos;re closed, already helping
                  another customer, driving, in a meeting, or simply unable to
                  answer. When nobody answers, some callers will try the next
                  business.{" "}
                  <span className="font-semibold text-[#0F172A]">
                    Customers.Direct AI Phone gives those callers someone to
                    talk to immediately.
                  </span>
                </p>
              </div>

              {/* ── CTA ── */}
              <div className="bg-white border-t border-gray-100 px-6 py-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                  className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
                >
                  Stop Missing These Customers
                </a>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("how-it-works");
                    if (el) {
                      const y =
                        el.getBoundingClientRect().top + window.scrollY - 88;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 text-[#2563EB] font-bold text-sm hover:text-[#1d4ed8] transition-colors"
                >
                  See How AI Phone Works{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>

              {/* ── DISCLAIMER ── */}
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-3">
                <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                  Estimate for illustration only. Actual call volume, customer
                  value, conversion rate, customer intent, business hours, and
                  results vary. Preview analysis — live business data
                  integration coming soon.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
