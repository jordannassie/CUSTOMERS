"use client";

import React, { useState, useRef, useEffect } from "react";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/Girl%20ugc.mp4";

const MESSAGES = [
  {
    name: "Sarah M.",
    initials: "S",
    msg: "I'm interested. Can I get more information?",
    color: "#DBEAFE",
    textColor: "#2563EB",
  },
  {
    name: "James T.",
    initials: "J",
    msg: "Do you offer free consultations?",
    color: "#F5F3FF",
    textColor: "#7C3AED",
  },
  {
    name: "Diana R.",
    initials: "D",
    msg: "Can I get a quote?",
    color: "#DCFCE7",
    textColor: "#16A34A",
  },
];

/* ─── useReducedMotion ───────────────────────────────────────────────────── */
function useReducedMotion(): boolean {
  // Lazy initializer avoids sync setState inside an effect
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ─── PhoneInbox (shared between desktop + mobile) ───────────────────────── */
function PhoneInbox({
  msgCount,
  showTyping,
}: {
  msgCount: number;
  showTyping: boolean;
}) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-8 pb-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-black text-[#0F172A]">Messages</span>
        {msgCount > 0 && (
          <span className="text-[10px] font-bold text-[#2563EB] bg-[#DBEAFE] px-2 py-0.5 rounded-full">
            {msgCount} new
          </span>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-hidden px-3 py-2 flex flex-col gap-2">
        {MESSAGES.slice(0, msgCount).map((msg) => (
          <div
            key={msg.name}
            style={{ animation: "messageSlideIn 0.4s ease forwards" }}
            className="flex items-center gap-2"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
              style={{ background: msg.color, color: msg.textColor }}
            >
              {msg.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-[#0F172A]">
                {msg.name}
              </div>
              <div className="text-[9px] text-[#64748B] truncate">{msg.msg}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
          </div>
        ))}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex items-center gap-1 px-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-400"
                style={{
                  animation: `typingDots 1s ease ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-3 pb-3 pt-1 border-t border-gray-100">
        <div className="bg-gray-100 rounded-full px-3 py-1.5 text-[9px] text-[#64748B]">
          Reply to message...
        </div>
      </div>
    </div>
  );
}

/* ─── VideoCard (outside wrapper to satisfy hooks/static-components rule) ── */
function VideoCard({
  width, height, videoRef, isPaused, setIsPaused,
}: {
  width: number; height: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPaused: boolean;
  setIsPaused: (v: boolean) => void;
}) {
  return (
    <div className="relative rounded-2xl shadow-2xl overflow-hidden" style={{ width, height }}>
      <video ref={videoRef} src={VIDEO_URL} autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/75" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-white text-[10px] font-bold uppercase tracking-wide opacity-90">VIDEO AD</span>
      </div>
      <button
        className="absolute bottom-3 right-3 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-sm"
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) { v.play(); setIsPaused(false); }
          else { v.pause(); setIsPaused(true); }
        }}
        aria-label={isPaused ? "Play video" : "Pause video"}
      >
        {isPaused
          ? <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          : <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        }
      </button>
    </div>
  );
}

/* ─── CampaignCard (outside wrapper) ────────────────────────────────────── */
function CampaignCard({ seqStep, campaignStatus }: { seqStep: number; campaignStatus: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="11" />
          </svg>
        </div>
        <span className="font-bold text-xs text-[#0F172A]">Targeted Campaign</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${seqStep >= 2 ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
        <span className={`text-[10px] font-semibold transition-colors duration-500 ${seqStep >= 2 ? "text-green-600" : "text-gray-400"}`}>
          {campaignStatus}
        </span>
      </div>
      <div className="border-t border-gray-100 my-2" />
      <div className="flex justify-between text-[10px] text-[#64748B]">
        <span>Objective</span><span className="font-medium text-[#0F172A]">Messages</span>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748B] mt-1">
        <span>Audience</span><span className="font-medium text-[#0F172A]">Local customers</span>
      </div>
      <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded-full"
          style={{ width: seqStep >= 2 ? "75%" : "0%", transition: "width 1.5s ease" }} />
      </div>
      <div className="flex mt-2 -space-x-1.5">
        {(["#DBEAFE", "#F5F3FF", "#DCFCE7"] as const).map((bg, i) => (
          <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold"
            style={{ background: bg, opacity: seqStep >= 2 ? 1 : 0, transitionDelay: `${i * 200}ms`, transition: "opacity 0.4s ease" }}>
            {["S", "J", "D"][i]}
          </div>
        ))}
        <span className="text-[9px] text-[#64748B] ml-2 self-center"
          style={{ opacity: seqStep >= 2 ? 1 : 0, transition: "opacity 0.4s ease 0.6s" }}>
          reaching audience
        </span>
      </div>
    </div>
  );
}

/* ─── HeroVisualWrapper — all animation state lives here ─────────────────── */
function HeroVisualWrapper() {
  const reducedMotion = useReducedMotion();

  const [seqStep, setSeqStep] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [replay, setReplay] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* IntersectionObserver */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Main sequence */
  useEffect(() => {
    if (!inView) return;

    if (reducedMotion) {
      // Defer to avoid synchronous setState inside effect body
      const t = setTimeout(() => {
        setSeqStep(5);
        setMsgCount(3);
        setShowNotif(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => setSeqStep(1), 300);
    const t2 = setTimeout(() => setSeqStep(2), 2100);
    const t3 = setTimeout(() => setSeqStep(3), 4100);
    const t4 = setTimeout(() => setSeqStep(4), 5300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [inView, replay, reducedMotion]);

  /* Message timing */
  useEffect(() => {
    if (seqStep !== 4) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setShowTyping(true), 0));
    timers.push(
      setTimeout(() => {
        setShowTyping(false);
        setMsgCount(1);
      }, 800)
    );
    timers.push(setTimeout(() => setShowTyping(true), 1200));
    timers.push(
      setTimeout(() => {
        setShowTyping(false);
        setMsgCount(2);
      }, 2000)
    );
    timers.push(setTimeout(() => setShowTyping(true), 2400));
    timers.push(
      setTimeout(() => {
        setShowTyping(false);
        setMsgCount(3);
        setSeqStep(5);
      }, 3200)
    );
    timers.push(setTimeout(() => setShowNotif(true), 3800));
    timers.push(
      setTimeout(() => {
        setShowNotif(false);
        setSeqStep(0);
        setMsgCount(0);
        setShowTyping(false);
        setTimeout(() => setReplay((r) => r + 1), 200);
      }, 7000)
    );

    return () => timers.forEach(clearTimeout);
  }, [seqStep]);

  const campaignStatus = seqStep >= 2 ? "Active" : "Preparing...";

  return (
    <div ref={containerRef} className="min-w-0 w-full">

      {/* ══════════════════════════════════════════════════
          DESKTOP  lg+
      ══════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        {/* Bounded relative container — all absolutes inside here */}
        <div className="relative w-full max-w-[620px] mx-auto" style={{ height: 500 }}>

          {/* Connector 1: video → campaign */}
          <div className="absolute" style={{ top: 148, left: 185, width: 36, height: 2, background: "linear-gradient(to right,#2563EB,#7C3AED)", zIndex: 5 }} />
          <div className="absolute overflow-hidden" style={{ top: 147, left: 185, width: 36, height: 4, zIndex: 5 }}>
            <div className="absolute top-0 h-full w-[40%] rounded" style={{ background: "rgba(255,255,255,0.7)", animation: seqStep >= 2 ? "flowPulse 1.2s ease-in-out infinite" : "none" }} />
          </div>

          {/* Element 1: Video */}
          <div className="absolute" style={{ top: 16, left: 0, width: 185, height: 320, position: "absolute" }}>
            <VideoCard width={185} height={320} videoRef={videoRef} isPaused={isPaused} setIsPaused={setIsPaused} />
          </div>

          {/* Element 2: Campaign card */}
          <div className="absolute z-20" style={{ top: 24, left: 160, width: 232 }}>
            <CampaignCard seqStep={seqStep} campaignStatus={campaignStatus} />
          </div>

          {/* Connector 2: campaign → phone */}
          <div className="absolute" style={{ top: 80, left: 392, width: 28, height: 2, background: "linear-gradient(to right,#7C3AED,#2563EB)", zIndex: 15 }} />
          <div className="absolute overflow-hidden" style={{ top: 79, left: 392, width: 28, height: 4, zIndex: 15 }}>
            <div className="absolute top-0 h-full w-[40%] rounded" style={{ background: "rgba(255,255,255,0.7)", animation: seqStep >= 3 ? "flowPulse 1.0s ease-in-out infinite" : "none" }} />
          </div>

          {/* Element 3: Phone */}
          <div className="absolute z-30" style={{ top: 10, right: 0, width: 210, height: 465 }}>
            <div className="w-full h-full bg-[#111] rounded-[36px] shadow-2xl p-[3px] relative">
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[70px] h-[20px] bg-[#111] rounded-full z-10" />
              <div className="w-full h-full bg-white rounded-[34px] overflow-hidden flex flex-col">
                <PhoneInbox msgCount={msgCount} showTyping={showTyping} />
              </div>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[140px] h-[14px] bg-black/20 blur-xl rounded-full" />
            {showNotif && (
              <div className="absolute top-5 right-[-8px] z-40 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
                style={{ animation: "fadeSlideUp 0.5s ease forwards" }}>
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-[#0F172A]">New customer inquiry</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MOBILE  < lg
      ══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full mt-10 mb-2">
        {/* Bounded container — all absolutes relative to this */}
        <div className="relative mx-auto" style={{ width: "100%", maxWidth: 380, height: 420 }}>

          {/* Phone — center-right */}
          <div className="absolute z-30" style={{ top: 36, right: 0, width: 220, height: 380 }}>
            <div className="w-full h-full bg-[#111] rounded-[32px] shadow-2xl p-[3px] relative">
              <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[60px] h-[18px] bg-[#111] rounded-full z-10" />
              <div className="w-full h-full bg-white rounded-[30px] overflow-hidden flex flex-col">
                <PhoneInbox msgCount={msgCount} showTyping={showTyping} />
              </div>
            </div>
          </div>

          {/* Video card — upper left */}
          <div className="absolute z-20" style={{ top: 0, left: 0, width: 118, height: 208, position: "absolute" }}>
            <VideoCard width={118} height={208} videoRef={videoRef} isPaused={isPaused} setIsPaused={setIsPaused} />
          </div>

          {/* Campaign card — below video */}
          <div className="absolute z-10" style={{ top: 220, left: 0, width: 152 }}>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3">
              <div className="text-[9px] font-black text-[#0F172A] mb-1">Targeted Campaign</div>
              <div className="flex items-center gap-1 mb-1.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${seqStep >= 2 ? "bg-green-400" : "bg-gray-300"}`} />
                <span className={`text-[8px] font-semibold transition-colors duration-500 ${seqStep >= 2 ? "text-green-600" : "text-gray-400"}`}>
                  {seqStep >= 2 ? "Active" : "Preparing..."}
                </span>
              </div>
              <div className="bg-gray-100 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded-full"
                  style={{ width: seqStep >= 2 ? "70%" : "0%", transition: "width 1.5s ease" }} />
              </div>
              <div className="text-[8px] text-[#64748B] mt-1.5">Objective: Messages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── HeroSection (left side unchanged) ─────────────────────────────────── */
export default function HeroSection() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="bg-white pt-12 pb-16 px-5" style={{ overflowX: "clip" }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[48%_52%] gap-10 xl:gap-16 items-center">
        {/* Left — Text */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Eyebrow */}
          <span className="text-xs font-semibold tracking-widest text-[#2563EB] uppercase">
            Customer Acquisition, Done For You
          </span>

          {/* H1 */}
          <h1 className="text-4xl md:text-5xl font-black text-[#0F172A] leading-tight">
            We drive new customers directly to your DMs.
          </h1>

          {/* Body */}
          <p className="text-lg text-[#64748B] leading-relaxed">
            We create and run targeted video ads that start conversations with
            people interested in your services.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => scrollTo("strategy-call")}
              className="inline-flex items-center justify-center bg-[#2563EB] text-white font-bold px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base"
            >
              Book a Strategy Call
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="inline-flex items-center justify-center border-2 border-[#2563EB] text-[#2563EB] font-bold px-8 py-4 rounded-full hover:bg-[#EFF6FF] transition-colors text-base"
            >
              See How It Works
            </button>
          </div>

          {/* Benefit Pills */}
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="bg-[#EFF6FF] text-[#0F172A] text-sm font-medium px-4 py-2 rounded-full">
              📍 Targeted video ads
            </span>
            <span className="bg-[#EFF6FF] text-[#0F172A] text-sm font-medium px-4 py-2 rounded-full">
              💬 More conversations in your DMs
            </span>
            <span className="bg-[#EFF6FF] text-[#0F172A] text-sm font-medium px-4 py-2 rounded-full">
              👥 Real people interested in you
            </span>
          </div>
        </div>

        {/* Right — Visual */}
        <HeroVisualWrapper />
      </div>
    </section>
  );
}
