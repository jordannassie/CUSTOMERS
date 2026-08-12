"use client";

import { useEffect, useState, useRef } from "react";
import { Check, PhoneCall, ArrowRight, Phone } from "lucide-react";

/* ── Waveform ─────────────────────────────────────────────────────────── */
const HEIGHTS = [30, 50, 70, 45, 85, 55, 65, 40, 75, 50, 60, 45, 80, 50, 35];

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8" aria-hidden="true">
      {HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-[#2563EB] origin-center"
          style={{
            height: `${h}%`,
            opacity: active ? 0.6 + (i % 3) * 0.13 : 0.2,
            animation: active ? `waveBar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Conversation bubble ─────────────────────────────────────────────── */
function Bubble({
  role,
  text,
  delay,
  visible,
}: {
  role: "caller" | "ai";
  text: string;
  delay: string;
  visible: boolean;
}) {
  const isAI = role === "ai";
  return (
    <div
      className={`flex flex-col gap-0.5 ${isAI ? "items-end" : "items-start"} transition-all duration-300`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : isAI ? "translateX(8px)" : "translateX(-8px)",
        animation: visible ? `${isAI ? "slideInRight" : "slideInLeft"} 0.35s ease forwards` : "none",
        animationDelay: delay,
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
        {isAI ? "AI Receptionist" : "Caller"}
      </span>
      <div
        className={`rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[88%] ${
          isAI
            ? "bg-[#2563EB] text-white rounded-tr-sm"
            : "bg-white border border-gray-200 text-[#0F172A] rounded-tl-sm"
        }`}
        style={{ boxShadow: isAI ? "0 2px 8px rgba(37,99,235,0.25)" : "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        {text}
      </div>
    </div>
  );
}

/* ── Conversation script ──────────────────────────────────────────────── */
const MESSAGES: { role: "caller" | "ai"; text: string; phase: number }[] = [
  { role: "caller", text: "Hi, I was wondering if you have any appointments available this week?", phase: 1 },
  { role: "ai", text: "Absolutely. I can help with that. Are mornings or afternoons better for you?", phase: 2 },
  { role: "caller", text: "Afternoons.", phase: 3 },
  { role: "ai", text: "Great. I'll text you our booking link so you can choose the time that works best.", phase: 4 },
];

/* ── Timer hook ───────────────────────────────────────────────────────── */
function useTimer(start: number, active: boolean) {
  const [secs, setSecs] = useState(start);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ── Phone Call Card ─────────────────────────────────────────────────── */
function PhoneCallCard() {
  const [phase, setPhase] = useState(0);
  const [bookingSent, setBookingSent] = useState(false);
  const [leadVisible, setLeadVisible] = useState(false);
  const reduced = useRef(false);
  const timer = useTimer(18, phase >= 0);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced.current) {
      setPhase(5);
      setBookingSent(true);
      setLeadVisible(true);
      return;
    }

    const delays = [1400, 2900, 4200, 5700, 7000, 9000];
    const timers = [
      setTimeout(() => setPhase(1), delays[0]),
      setTimeout(() => setPhase(2), delays[1]),
      setTimeout(() => setPhase(3), delays[2]),
      setTimeout(() => setPhase(4), delays[3]),
      setTimeout(() => setBookingSent(true), delays[4]),
      setTimeout(() => setLeadVisible(true), delays[5]),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative select-none">
      {/* Main call card */}
      <div
        className="bg-white rounded-3xl border border-gray-100 overflow-hidden w-full max-w-[340px] mx-auto"
        style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(37,99,235,0.08)" }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" aria-hidden="true" />
          <span className="text-xs font-bold text-[#0F172A] tracking-wide">Live Call</span>
          <span className="ml-auto text-xs font-medium text-[#22C55E]">Connected</span>
        </div>

        {/* Caller info */}
        <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center border-b border-gray-100">
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center mb-3"
            aria-hidden="true"
          >
            <Phone size={22} className="text-white" />
          </div>
          <p className="font-bold text-[#0F172A] text-base">Sarah Mitchell</p>
          <p className="text-xs text-[#64748B] mt-0.5">New Customer</p>
          <p className="text-sm font-mono text-[#2563EB] mt-1 font-semibold">{timer}</p>
          <div className="mt-3 w-full">
            <Waveform active={phase >= 0} />
          </div>
        </div>

        {/* Conversation */}
        <div className="px-5 py-4 flex flex-col gap-3 min-h-[180px]">
          {MESSAGES.map((msg, i) => (
            <Bubble
              key={i}
              role={msg.role}
              text={msg.text}
              delay="0s"
              visible={phase >= msg.phase}
            />
          ))}

          {/* Booking sent badge */}
          {bookingSent && (
            <div
              className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-3 py-2 text-xs font-semibold text-[#15803D]"
              style={{ animation: "popIn 0.4s ease forwards" }}
            >
              <Check size={13} aria-hidden="true" />
              Booking Link Sent
            </div>
          )}
        </div>
      </div>

      {/* Floating lead card */}
      {leadVisible && (
        <div
          className="absolute -bottom-5 -right-4 w-52 bg-white rounded-2xl border border-gray-100 p-4"
          style={{
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            animation: "floatUp 0.5s ease forwards",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">New Lead</span>
          </div>
          <p className="font-bold text-[#0F172A] text-sm">Sarah Mitchell</p>
          <div className="mt-2 flex flex-col gap-1">
            {["Appointment request", "Afternoon preferred", "Booking link sent"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                <Check size={10} className="text-[#22C55E] shrink-0" aria-hidden="true" />
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Hero Section ────────────────────────────────────────────────────── */
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
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)" }}>
              Customer Call.
            </span>
          </h1>

          <p className="text-lg text-[#64748B] leading-relaxed mb-8 max-w-md">
            Your AI Receptionist answers 24/7, qualifies callers, books appointments,
            and sends you the lead — automatically.
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

          {/* Trust items */}
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
          <PhoneCallCard />
        </div>
      </div>
    </section>
  );
}
