"use client";

import { useState, useMemo } from "react";
import { PhoneCall, TrendingUp } from "lucide-react";

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#0F172A]">{label}</label>
        <span className="text-sm font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg px-3 py-1">
          {format(value)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #2563EB ${pct}%, #E2E8F0 ${pct}%)`,
            WebkitAppearance: "none",
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#94A3B8] font-medium">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function MissedCallCalculator() {
  const [missedPerDay, setMissedPerDay] = useState(3);
  const [avgValue, setAvgValue] = useState(750);
  const [closeRate, setCloseRate] = useState(30);

  const monthly = useMemo(
    () => Math.round(missedPerDay * 30 * avgValue * (closeRate / 100)),
    [missedPerDay, avgValue, closeRate]
  );

  function scrollToDemo() {
    const el = document.getElementById("demo");
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  return (
    <section className="bg-[#EFF6FF] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow + Headline */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            The Cost of a Missed Call
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight max-w-2xl mx-auto mb-4">
            How much opportunity could be slipping through your phone?
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <div
            className="bg-white rounded-3xl border border-[#DBEAFE] p-8 sm:p-10"
            style={{ boxShadow: "0 4px 32px rgba(37,99,235,0.08)" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {/* Sliders */}
              <div className="flex flex-col gap-7">
                <Slider
                  label="Missed calls per day"
                  value={missedPerDay}
                  min={1}
                  max={20}
                  step={1}
                  format={(v) => `${v} calls`}
                  onChange={setMissedPerDay}
                />
                <Slider
                  label="Average customer value"
                  value={avgValue}
                  min={100}
                  max={10000}
                  step={50}
                  format={(v) => `$${v.toLocaleString()}`}
                  onChange={setAvgValue}
                />
                <Slider
                  label="Estimated close rate"
                  value={closeRate}
                  min={5}
                  max={100}
                  step={5}
                  format={(v) => `${v}%`}
                  onChange={setCloseRate}
                />
              </div>

              {/* Result */}
              <div className="flex flex-col gap-5">
                <div
                  className="rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] border border-[#DBEAFE] p-6 text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-[#2563EB]" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#64748B]">
                      Potential monthly revenue at risk
                    </span>
                  </div>
                  <div
                    className="text-5xl font-black text-transparent bg-clip-text mb-2"
                    style={{ backgroundImage: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)" }}
                    aria-live="polite"
                    aria-label={`Potential monthly revenue at risk: $${monthly.toLocaleString()}`}
                  >
                    ${monthly.toLocaleString()}
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    per month based on your inputs
                  </p>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed text-center">
                  This is an estimate for illustration only. Actual results depend on
                  call quality, customer intent, close rate, business type, and other
                  factors.
                </p>

                <button
                  onClick={scrollToDemo}
                  className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                >
                  <PhoneCall size={15} aria-hidden="true" />
                  Stop Missing Calls
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
