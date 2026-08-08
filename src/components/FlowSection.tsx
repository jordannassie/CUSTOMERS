"use client";

import { useRef, useState, useEffect } from "react";

const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/Girl%20ugc.mp4";

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const t = setTimeout(() => setReduced(mq.matches), 0);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => { clearTimeout(t); mq.removeEventListener("change", handler); };
  }, []);
  return reduced;
}

// ─── Step 1 Card ─────────────────────────────────────────────────────────────
function VideoAdCard({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  function togglePlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden w-full md:w-64 shadow-lg border-2 transition-all duration-500 ${active ? "border-[#2563EB] shadow-blue-200" : "border-transparent"}`}
      style={{ minHeight: 220 }}
    >
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />

      {/* Progress bar looping */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
        <div
          className="absolute inset-y-0 bg-white/60 rounded"
          style={{
            animation: "progressBar 8s linear infinite",
          }}
        />
      </div>

      {/* Label */}
      <div className="absolute bottom-4 left-4 right-12 z-10">
        <div className="text-white font-bold text-sm">Video Ad Creative</div>
        <div className="text-white/70 text-xs mt-0.5">Custom-made for your business</div>
      </div>

      {/* Play/pause button */}
      <button
        onClick={togglePlayPause}
        className="absolute bottom-4 right-3 z-10 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center transition-colors"
        aria-label={paused ? "Play video" : "Pause video"}
      >
        {paused ? (
          <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Step 2 Card ─────────────────────────────────────────────────────────────
function CampaignCard({ active }: { active: boolean }) {
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setMsgCount(current);
      if (current >= 12) clearInterval(interval);
    }, 1000 / 12);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div
      className={`bg-white rounded-2xl p-5 w-full md:w-64 shadow-lg border-2 transition-all duration-500 ${active ? "border-[#7C3AED] shadow-violet-100" : "border-gray-100"}`}
      style={{ minHeight: 220 }}
    >
      {/* Ad preview row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-16 rounded overflow-hidden shrink-0">
          <video
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div
            className={`flex items-center gap-1.5 mb-1 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs font-semibold text-green-600">Campaign Active</span>
          </div>
          <div className="text-[10px] text-gray-500">Objective: Messages</div>
        </div>
      </div>

      {/* Audience */}
      <div className="flex items-center gap-1 mb-4">
        {["#2563EB", "#7C3AED", "#FF6B6B"].map((color, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{
              backgroundColor: color,
              marginLeft: i > 0 ? -8 : 0,
              animation: active ? `fadeSlideUp 0.3s ease ${i * 100}ms both` : "none",
            }}
          >
            {["A", "B", "C"][i]}
          </div>
        ))}
        <span className="text-[10px] text-gray-500 ml-2">Local area</span>
      </div>

      {/* Concentric circles targeting indicator */}
      <div className="flex justify-center mb-3">
        <svg width="60" height="60" viewBox="0 0 60 60" className="opacity-30">
          <circle cx="30" cy="30" r="28" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="30" cy="30" r="18" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx="30" cy="30" r="8" fill="#7C3AED" opacity="0.3" />
          <circle cx="30" cy="30" r="3" fill="#7C3AED" />
        </svg>
      </div>

      {/* Message counter */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">Messages</span>
        <span className="text-sm font-black text-[#7C3AED]">{msgCount}</span>
      </div>
    </div>
  );
}

// ─── Step 3 Card ─────────────────────────────────────────────────────────────
function InboxCard({ active }: { active: boolean }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setShown(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      className={`bg-white rounded-2xl p-5 w-full md:w-64 shadow-lg border-2 transition-all duration-500 ${active ? "border-[#FF6B6B] shadow-red-100" : "border-gray-100"}`}
      style={{
        minHeight: 220,
        animation: active ? "vibrate 0.4s ease" : "none",
      }}
    >
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        {shown && (
          <>
            {/* Notification badge */}
            <div
              className="flex items-center gap-1.5 bg-[#EFF6FF] border border-blue-200 rounded-full px-2.5 py-1 w-fit mb-3 text-xs font-semibold text-[#2563EB]"
              style={{ animation: "badgePop 0.4s ease forwards" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              New customer inquiry
            </div>

            {/* Message bubble */}
            <div
              className="flex items-start gap-2"
              style={{ animation: "messageSlideIn 0.4s ease 0.2s both" }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center text-white text-xs font-bold shrink-0">
                SM
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800 mb-0.5">Sarah M.</div>
                <div className="bg-[#DBEAFE] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[160px]">
                  <span className="text-xs text-[#0F172A]">
                    Hi, I&apos;m interested. Can I get more information?
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[#0F172A] font-bold text-sm">Incoming Customer DM</span>
        <div className="text-[#64748B] text-xs mt-0.5">Direct messages to your inbox</div>
      </div>
    </div>
  );
}

// ─── Animated Connector ──────────────────────────────────────────────────────
function Connector({ active }: { active: boolean }) {
  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center shrink-0">
        <div className="relative w-12 h-1 bg-gray-200 rounded overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded"
            style={{
              width: active ? "100%" : "0%",
              transition: "width 0.8s ease",
            }}
          />
        </div>
        <div className="text-[#7C3AED] font-black text-2xl ml-1">›</div>
      </div>
      {/* Mobile: vertical */}
      <div className="flex md:hidden items-center justify-center py-1">
        <div className="relative h-8 w-1 bg-gray-200 rounded overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#2563EB] to-[#7C3AED] rounded"
            style={{
              height: active ? "100%" : "0%",
              transition: "height 0.8s ease",
            }}
          />
        </div>
      </div>
    </>
  );
}

// ─── Benefit Pills ────────────────────────────────────────────────────────────
const PILLS = [
  {
    label: "Custom video ads",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Targeted campaigns",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    label: "Direct-to-DM leads",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    label: "Done for you",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlowSection() {
  const { ref, inView } = useInView(0.2);
  const reduced = useReducedMotion();
  const [flowStep, setFlowStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setTimeout(() => setFlowStep(3), 0); return; }
    if (flowStep === 0) {
      const t = setTimeout(() => setFlowStep(1), 300);
      return () => clearTimeout(t);
    }
    if (flowStep === 1) {
      const t = setTimeout(() => setFlowStep(2), 2500);
      return () => clearTimeout(t);
    }
    if (flowStep === 2) {
      const t = setTimeout(() => setFlowStep(3), 2500);
      return () => clearTimeout(t);
    }
  }, [inView, flowStep, reduced]);

  function replay() {
    setFlowStep(0);
    setTimeout(() => setFlowStep(1), 50);
  }

  return (
    <section className="gradient-bg py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Built to drive real conversations.
          </h2>
        </div>

        {/* Flow */}
        <div
          ref={ref}
          className="flex flex-col md:flex-row items-center justify-center gap-0 mb-12"
        >
          <VideoAdCard active={flowStep >= 1} />
          <Connector active={flowStep >= 2} />
          <CampaignCard active={flowStep >= 2} />
          <Connector active={flowStep >= 3} />
          <InboxCard active={flowStep >= 3} />
        </div>

        {/* Benefit Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {PILLS.map((pill, i) => (
            <span
              key={pill.label}
              className="flex items-center gap-2 bg-white text-[#0F172A] text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm border border-gray-100"
              style={{
                opacity: flowStep >= 1 ? 1 : 0,
                transform: flowStep >= 1 ? "translateY(0)" : "translateY(8px)",
                transition: `opacity 0.4s ease ${i * 100}ms, transform 0.4s ease ${i * 100}ms`,
              }}
            >
              {pill.icon}
              {pill.label}
            </span>
          ))}
        </div>

        {/* Replay button */}
        <div className="flex justify-end">
          <button
            onClick={replay}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#2563EB] border border-gray-200 hover:border-[#2563EB] px-4 py-1.5 rounded-full transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Replay
          </button>
        </div>
      </div>
    </section>
  );
}
