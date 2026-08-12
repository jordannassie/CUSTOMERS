"use client";

import { useState, useEffect } from "react";
import { Check, FileText } from "lucide-react";

// ── Phase types ──────────────────────────────────────────────────────────────
type Phase = "lock" | "notify" | "open";

// ── Lock screen ──────────────────────────────────────────────────────────────
function LockScreen({ notifyVisible }: { notifyVisible: boolean }) {
  return (
    <div
      className="relative flex flex-col justify-between h-full overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #1a1040 0%, #0f0628 40%, #1a2060 100%)",
      }}
    >
      {/* Top: time + date */}
      <div className="flex flex-col items-center pt-14 select-none">
        <p className="text-white/50 text-[11px] font-semibold tracking-widest mb-1">
          Wednesday, May 14
        </p>
        <p
          className="text-white font-black leading-none"
          style={{ fontSize: "clamp(52px, 15vw, 72px)", letterSpacing: "-2px" }}
        >
          2:34
        </p>
      </div>

      {/* Bottom: notification toast */}
      <div className="px-4 pb-8">
        <div
          className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.18)",
            transform: notifyVisible ? "translateY(0)" : "translateY(30px)",
            opacity: notifyVisible ? 1 : 0,
            transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease",
          }}
        >
          {/* Messages icon */}
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-white text-[11px] font-bold uppercase tracking-widest">
                Messages
              </p>
              <p className="text-white/50 text-[10px]">now</p>
            </div>
            <p className="text-white font-bold text-[12px] leading-tight">
              +1 (214) 555-0148
            </p>
            <p className="text-white/70 text-[11px] leading-snug mt-0.5">
              New lead — Sarah M. · Botox consultation. Booking link sent. Tap to open.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Open SMS thread ───────────────────────────────────────────────────────────
function OpenSMS({ visible }: { visible: boolean }) {
  return (
    <div
      className="flex flex-col h-full bg-white"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.97)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      {/* SMS header */}
      <div
        className="bg-[#F8FAFC] border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0"
        style={{ paddingTop: "14px" }}
      >
        <button className="text-[#2563EB] text-sm font-semibold flex items-center gap-1">
          <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true">
            <path d="M7 1L1 6.5L7 12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-black text-sm shrink-0">
          C
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#0F172A] text-[13px] leading-tight">
            Customers.Direct
          </p>
          <p className="text-[#94A3B8] text-[10px]">SMS · just now</p>
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-hidden px-3 py-4 flex flex-col justify-end gap-3">
        {/* Main bubble */}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 bg-[#F1F5F9] text-[#0F172A]"
          style={{
            animation: visible ? "messageSlideIn 0.4s 0.1s ease both" : "none",
          }}
        >
          <p className="font-bold text-[#7C3AED] text-[12px] mb-1.5">
            New lead · Sarah M.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#334155] mb-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.09 1.2 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            (214) 555-0148
          </div>
          <p className="text-[11px] text-[#334155] leading-relaxed">
            Interested in Botox consultation.<br />
            Prefers Thursday afternoon.
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Urgency: <span className="font-bold text-amber-600">Normal</span>
          </p>
          <hr className="border-gray-200 my-2.5" />
          <div className="flex items-start gap-1.5 text-[11px] text-[#15803D] font-semibold">
            <span className="text-base leading-none">✅</span>
            <span>Booking link sent to Sarah — she&apos;s picking a slot now.</span>
          </div>
          {/* Link card */}
          <div className="mt-2.5 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.09 1.2 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#0F172A]">View all call details</p>
              <p className="text-[9px] text-[#94A3B8]">customers.direct/call/details</p>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-[#94A3B8] pl-1">
          Customers.Direct · 2:34 PM
        </p>
      </div>
    </div>
  );
}

// ── Animated iPhone ───────────────────────────────────────────────────────────
function AnimatedPhone() {
  const [phase, setPhase] = useState<Phase>("lock");
  const [notifyVisible, setNotifyVisible] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;

    if (phase === "lock") {
      // After 1.5s, slide up the notification
      t = setTimeout(() => setNotifyVisible(true), 1500);
    } else if (phase === "notify") {
      // Notification visible — transition to open after 3s
      t = setTimeout(() => {
        setPhase("open");
        setNotifyVisible(false);
      }, 3000);
    } else if (phase === "open") {
      // Show open message for 5s then reset
      t = setTimeout(() => {
        setPhase("lock");
      }, 5000);
    }

    return () => clearTimeout(t);
  }, [phase]);

  // Transition lock → notify when notification is visible
  useEffect(() => {
    if (notifyVisible && phase === "lock") {
      const t = setTimeout(() => setPhase("notify"), 600);
      return () => clearTimeout(t);
    }
  }, [notifyVisible, phase]);

  return (
    <div
      className="relative mx-auto select-none"
      style={{
        width: 260,
        animation: "phonefloat 4s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes phonefloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-[44px] pointer-events-none"
        style={{
          boxShadow: "0 0 60px 10px rgba(124,58,237,0.18), 0 40px 80px rgba(15,23,42,0.35)",
        }}
      />

      {/* Phone shell */}
      <div
        className="relative rounded-[44px] overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 100%)",
          padding: "10px",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 1px #000",
        }}
      >
        {/* Screen */}
        <div className="rounded-[36px] overflow-hidden" style={{ height: 520, position: "relative" }}>
          {/* Dynamic island */}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black rounded-full"
            style={{ width: 100, height: 28 }}
          />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-7 pt-3 pb-1">
            <span className="text-white text-[11px] font-bold">2:34</span>
            <div className="flex items-center gap-1" aria-hidden="true">
              {/* Signal */}
              <svg width="15" height="10" viewBox="0 0 15 10" fill="white" opacity="0.8">
                <rect x="0" y="5" width="3" height="5" rx="0.5" />
                <rect x="4" y="3" width="3" height="7" rx="0.5" />
                <rect x="8" y="1" width="3" height="9" rx="0.5" />
                <rect x="12" y="0" width="3" height="10" rx="0.5" opacity="0.3" />
              </svg>
              {/* WiFi */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="white" opacity="0.8">
                <path d="M7 8.5a1 1 0 100 2 1 1 0 000-2z" />
                <path d="M4.2 6.3C5 5.5 6 5 7 5s2 .5 2.8 1.3l1.4-1.4C10 3.7 8.6 3 7 3s-3 .7-4.2 1.9l1.4 1.4z" />
                <path d="M1.4 3.6C2.8 2.2 4.8 1.3 7 1.3s4.2.9 5.6 2.3l1.4-1.4C12.3.7 9.8 0 7 0S1.7.7 0 2.2l1.4 1.4z" />
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-0.5">
                <div className="w-5 h-2.5 rounded-sm border border-white/60 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-3/4 bg-white/70 rounded-sm" />
                </div>
                <div className="w-0.5 h-1.5 bg-white/40 rounded-r-sm" />
              </div>
            </div>
          </div>

          {/* Lock screen — always mounted, hidden when open */}
          <div
            className="absolute inset-0"
            style={{
              opacity: phase === "open" ? 0 : 1,
              transition: "opacity 0.35s ease",
              pointerEvents: phase === "open" ? "none" : "auto",
            }}
          >
            <LockScreen notifyVisible={notifyVisible} />
          </div>

          {/* Open SMS — always mounted, shown when phase === open */}
          <div
            className="absolute inset-0"
            style={{
              opacity: phase === "open" ? 1 : 0,
              transition: "opacity 0.35s ease",
              pointerEvents: phase === "open" ? "auto" : "none",
            }}
          >
            <OpenSMS visible={phase === "open"} />
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-28 h-1 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute left-[-3px] top-[110px] w-1 h-8 bg-[#3a3a3c] rounded-l-sm" />
      <div className="absolute left-[-3px] top-[150px] w-1 h-14 bg-[#3a3a3c] rounded-l-sm" />
      <div className="absolute left-[-3px] top-[176px] w-1 h-14 bg-[#3a3a3c] rounded-l-sm" />
      <div className="absolute right-[-3px] top-[140px] w-1 h-20 bg-[#3a3a3c] rounded-r-sm" />
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function AICallSummarySection() {
  return (
    <section className="gradient-bg py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* LEFT — Copy */}
        <div>
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            After Every Call
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight mb-6">
            Know exactly who called and what they need.
          </h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-8 max-w-md">
            Your team receives a clear lead summary so you know who to follow up
            with, what they wanted, and what happened during the conversation.
          </p>

          <div className="flex flex-col gap-4">
            {[
              "Caller name and contact information",
              "What they were looking for",
              "Urgency and next steps",
              "What the AI said and did during the call",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0">
                  <Check size={12} className="text-[#2563EB]" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-[#64748B]">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl px-4 py-3">
            <FileText size={16} className="text-[#2563EB]" aria-hidden="true" />
            <span className="text-sm font-semibold text-[#2563EB]">
              Lead summary sent after every call
            </span>
          </div>
        </div>

        {/* RIGHT — Animated phone */}
        <div className="flex justify-center lg:justify-end py-8 lg:py-0">
          <AnimatedPhone />
        </div>
      </div>
    </section>
  );
}
