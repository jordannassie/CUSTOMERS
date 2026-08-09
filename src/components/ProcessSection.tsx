"use client";

import React, { useRef, useState, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/Girl%20ugc.mp4";
const PEOPLE_IMG =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/a9c61524-bac4-4800-b36b-040183de7cec.png";

const MESSAGES = [
  {
    name: "Sarah J.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face&auto=format",
    text: "I'm interested.",
    time: "Now",
  },
  {
    name: "Mike R.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face&auto=format",
    text: "Can I get a quote?",
    time: "2m",
  },
  {
    name: "Alex T.",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&h=60&fit=crop&crop=face&auto=format",
    text: "Do you have availability?",
    time: "5m",
  },
];

const CLOSE_STATUSES = [
  { label: "New inquiry" },
  { label: "Call scheduled" },
  { label: "New customer" },
];

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
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

// ─── Progress Indicator ──────────────────────────────────────────────────────

const STEP_ICONS = [
  /* 1 — Video */
  <svg key="1" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
  </svg>,
  /* 2 — Campaign / target */
  <svg key="2" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="11" />
  </svg>,
  /* 3 — DM / chat */
  <svg key="3" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
  </svg>,
  /* 4 — Closed / checkmark */
  <svg key="4" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
];

function ProgressIndicator({ step }: { step: number }) {
  const dots = [
    { color: "#2563EB", glow: "rgba(37,99,235,0.35)" },
    { color: "#7C3AED", glow: "rgba(124,58,237,0.35)" },
    { color: "#FF6B6B", glow: "rgba(255,107,107,0.35)" },
    { color: "#22C55E", glow: "rgba(34,197,94,0.35)" },
  ];
  return (
    <div className="flex items-end justify-center mb-10">
      <div className="flex items-end">
        {dots.map((dot, i) => (
          <React.Fragment key={i}>
            {/* Column: icon above + dot below */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              {/* Icon — no background, just colored */}
              <div
                className="w-6 h-6 flex items-center justify-center transition-all duration-500"
                style={{ color: step >= i + 1 ? dot.color : "#D1D5DB" }}
              >
                {STEP_ICONS[i]}
              </div>
              {/* Numbered dot */}
              <div
                className="relative w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-white z-10 transition-all duration-500"
                style={{
                  background: step >= i + 1 ? dot.color : "#E5E7EB",
                  boxShadow: step === i + 1 ? `0 0 0 7px ${dot.glow}` : "none",
                }}
              >
                {i + 1}
              </div>
            </div>
            {/* Gap between steps */}
            {i < 3 && <div className="w-8 sm:w-14 mb-[18px]" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Card Shell ──────────────────────────────────────────────────────────────

function CardShell({
  num, accent, title, description, active, children,
}: {
  num: number; accent: string; title: string; description: string;
  active: boolean; children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col bg-white rounded-[22px] border-2 transition-all duration-500 h-full"
      style={{
        borderColor: active ? accent : "#F3F4F6",
        boxShadow: active ? `0 8px 30px ${accent}22` : "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0"
            style={{ background: accent }}
          >
            {num}
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-[#0F172A] leading-tight">{title}</h3>
        </div>
        <p className="text-sm md:text-base text-[#475569] leading-relaxed">{description}</p>
      </div>
      {/* Visual area — overflow hidden only here */}
      <div className="flex-1 px-5 pb-6 overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}

// ─── Card 1: We create your ads ──────────────────────────────────────────────

function Card1Visual({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const duration = 15;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handler = () => setElapsed(v.currentTime);
    v.addEventListener("timeupdate", handler);
    return () => v.removeEventListener("timeupdate", handler);
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }

  const progress = Math.min((elapsed / duration) * 100, 100);

  return (
    /* Center a 9:16 video frame — max-width keeps it from being too wide on large cards */
    <div className="flex items-start justify-center h-full pt-1">
      <div
        className="relative bg-black rounded-[18px] overflow-hidden shadow-xl w-full"
        style={{ aspectRatio: "9/16", maxWidth: 148 }}
      >
        <video
          ref={videoRef}
          src={VIDEO_URL}
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

        {active && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5"
            style={{ animation: "fadeSlideUp 0.5s ease forwards" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Video Ready
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
          <div className="w-full bg-white/30 rounded-full h-[3px] mb-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={togglePlay}
              aria-label={paused ? "Play" : "Pause"}
              className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
            >
              {paused
                ? <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                : <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              }
            </button>
            <span className="text-white text-[10px] font-mono">
              0:{String(Math.floor(elapsed % 60)).padStart(2, "0")} / 0:{String(duration).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card 2: We run the campaigns ────────────────────────────────────────────

function Card2Visual({ active }: { active: boolean }) {
  const [status, setStatus] = useState<"idle" | "preparing" | "active">("idle");
  const [deliveryPct, setDeliveryPct] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t0 = setTimeout(() => setStatus("preparing"), 0);
    const t1 = setTimeout(() => { setStatus("active"); setMapExpanded(true); }, 800);
    const t2 = setTimeout(() => setDeliveryPct(75), 1200);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div className="flex flex-col gap-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm h-full">
      {/* Campaign identity + status */}
      <div className="flex items-start gap-3 shrink-0">
        <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-900">
          <video src={VIDEO_URL} autoPlay muted loop playsInline className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-500"
              style={{ background: status === "active" ? "#22C55E" : "#9CA3AF" }}
            />
            <span
              className="text-xs font-black uppercase tracking-wider transition-colors duration-500"
              style={{ color: status === "active" ? "#22C55E" : "#9CA3AF" }}
            >
              {status === "active" ? "Active" : status === "preparing" ? "Preparing..." : ""}
            </span>
          </div>
          <div className="text-sm text-[#64748B] mb-1.5">
            Objective: <strong className="text-[#0F172A]">Messages</strong>
          </div>
          <div className="text-sm text-[#64748B]">
            Audience: <strong className="text-[#0F172A]">Local customers</strong>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 shrink-0" />

      {/* Location target — clean SVG map */}
      <div className="shrink-0">
        <div className="text-xs text-[#64748B] font-semibold mb-2 uppercase tracking-wide">
          Location target
        </div>
        <div className="relative bg-[#EFF6FF] rounded-xl overflow-hidden" style={{ height: 84 }}>
          <svg
            className="w-full h-full"
            viewBox="0 0 240 84"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Soft road curves */}
            <path d="M 0 42 Q 60 26 120 42 Q 180 58 240 42" stroke="#BFDBFE" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.65"/>
            <path d="M 120 0 Q 108 42 120 84" stroke="#BFDBFE" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.45"/>
            <path d="M 0 68 Q 80 64 150 70 Q 200 74 240 65" stroke="#BFDBFE" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.35"/>

            {/* Concentric targeting circles */}
            <circle cx="120" cy="42" r={mapExpanded ? 36 : 0} fill="rgba(124,58,237,0.06)" stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="4 3" style={{ transition: "r 1.2s ease" }}/>
            <circle cx="120" cy="42" r={mapExpanded ? 20 : 0} fill="rgba(124,58,237,0.09)" stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="3 2" style={{ transition: "r 0.9s ease 0.25s" }}/>

            {/* Location pin */}
            <circle cx="120" cy="42" r="6" fill="#7C3AED" opacity={mapExpanded ? 1 : 0} style={{ transition: "opacity 0.5s ease 0.5s" }}/>
            <circle cx="120" cy="42" r="2.5" fill="white" opacity={mapExpanded ? 1 : 0} style={{ transition: "opacity 0.5s ease 0.5s" }}/>

            {/* Clip paths for circular avatar photos */}
            <defs>
              <clipPath id="clip-s"><circle cx="86" cy="19" r="9"/></clipPath>
              <clipPath id="clip-j"><circle cx="156" cy="17" r="9"/></clipPath>
              <clipPath id="clip-d"><circle cx="148" cy="68" r="9"/></clipPath>
            </defs>

            {/* Customer avatars at radius — photo circles */}
            {/* Avatar S */}
            <g opacity={mapExpanded ? 1 : 0} style={{ transition: "opacity 0.4s ease 0.85s" }}>
              <image href="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face&auto=format" x="77" y="10" width="18" height="18" clipPath="url(#clip-s)" preserveAspectRatio="xMidYMid slice"/>
              <circle cx="86" cy="19" r="9" fill="none" stroke="white" strokeWidth="1.5"/>
            </g>

            {/* Avatar J */}
            <g opacity={mapExpanded ? 1 : 0} style={{ transition: "opacity 0.4s ease 1.05s" }}>
              <image href="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face&auto=format" x="147" y="8" width="18" height="18" clipPath="url(#clip-j)" preserveAspectRatio="xMidYMid slice"/>
              <circle cx="156" cy="17" r="9" fill="none" stroke="white" strokeWidth="1.5"/>
            </g>

            {/* Avatar D */}
            <g opacity={mapExpanded ? 1 : 0} style={{ transition: "opacity 0.4s ease 1.25s" }}>
              <image href="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face&auto=format" x="139" y="59" width="18" height="18" clipPath="url(#clip-d)" preserveAspectRatio="xMidYMid slice"/>
              <circle cx="148" cy="68" r="9" fill="none" stroke="white" strokeWidth="1.5"/>
            </g>
          </svg>
        </div>
      </div>

      {/* Audience delivery */}
      <div className="shrink-0">
        <div className="text-xs text-[#64748B] font-semibold mb-2 uppercase tracking-wide">
          Audience delivery
        </div>
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          {[
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face&auto=format",
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&crop=face&auto=format",
          ].map((src, i) => {
            const reached = (i / 10) * 100 < deliveryPct;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={src}
                alt="Audience member"
                className="w-6 h-6 rounded-full object-cover border-2 transition-all duration-300"
                style={{
                  borderColor: reached ? "#7C3AED" : "#E9D5FF",
                  opacity: reached ? 1 : 0.25,
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            );
          })}
        </div>
        <div className="text-xs text-[#64748B]">Reaching local people in your area.</div>
      </div>
    </div>
  );
}

// ─── Card 3: Customers DM you ─────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-gray-400"
          style={{ animation: `typingDots 1.2s ease ${i * 0.2}s infinite` }}
        />
      ))}
      <span className="text-xs text-[#64748B] ml-1">Someone is typing...</span>
    </div>
  );
}

function Card3Visual({ active }: { active: boolean }) {
  const [msgCount, setMsgCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const add = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    add(() => setTyping(true), 200);
    add(() => { setTyping(false); setMsgCount(1); }, 900);
    add(() => setTyping(true), 1400);
    add(() => { setTyping(false); setMsgCount(2); }, 2100);
    add(() => setTyping(true), 2600);
    add(() => { setTyping(false); setMsgCount(3); }, 3300);
    add(() => setShowInquiry(true), 3800);

    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div
      className="bg-white rounded-[18px] border border-gray-200 flex flex-col overflow-hidden"
      style={{ minHeight: 240 }}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <span className="text-xs font-semibold text-[#0F172A]">9:41</span>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#0F172A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1.5 8.5A13 13 0 0122.5 8.5M5 12a10 10 0 0114 0M8.5 15.5a6 6 0 017 0M12 19h.01" />
          </svg>
          <svg className="w-3.5 h-3 text-[#0F172A]" fill="none" viewBox="0 0 24 16">
            <rect x="0" y="3" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="20" y="6" width="4" height="4" rx="1" fill="currentColor" />
            <rect x="1" y="4" width="14" height="8" rx="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Inbox header */}
      <div className="flex items-center justify-between px-4 pb-2 shrink-0">
        <span className="text-base font-black text-[#0F172A]">Inbox</span>
        <svg className="w-5 h-5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="border-t border-gray-100 shrink-0" />

      {/* Message rows */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {MESSAGES.slice(0, msgCount).map((msg, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 shrink-0"
            style={{ animation: "messageSlideIn 0.4s ease forwards" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.avatar} alt={msg.name} width={40} height={40}
              className="w-10 h-10 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-black text-[#0F172A]">{msg.name}</span>
                <span className="text-xs text-[#64748B]">{msg.time}</span>
              </div>
              <p className="text-xs text-[#64748B] truncate">{msg.text}</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
          </div>
        ))}
        {typing && <TypingIndicator />}
      </div>

      {/* NEW INQUIRY badge */}
      {showInquiry && (
        <div className="px-4 py-3 shrink-0" style={{ animation: "badgePop 0.4s ease forwards" }}>
          <button className="w-full flex items-center justify-center gap-2 bg-[#FF6B6B] text-white text-xs font-black uppercase tracking-wider rounded-full py-2.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            New Inquiry
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card 4: You close them ───────────────────────────────────────────────────

function Card4Visual({ active }: { active: boolean }) {
  const [closeStep, setCloseStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setCloseStep(1), 600);
    const t2 = setTimeout(() => setCloseStep(2), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* Business owner photo — face fully visible */}
      <div className="relative rounded-xl overflow-hidden flex-1" style={{ minHeight: 110 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PEOPLE_IMG}
          alt="Business owner on phone"
          className="w-full h-full object-cover object-top"
        />
        {/* Subtle bottom fade only */}
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-black/15 to-transparent" />
      </div>

      {/* Status card — BELOW the image, not overlaid */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 shrink-0">
        <div className="flex flex-col gap-1.5">
          {CLOSE_STATUSES.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-3">
                {/* Circle check */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                    closeStep >= i
                      ? i === 2 ? "border-green-500 bg-green-50" : "border-[#2563EB] bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {closeStep >= i && (
                    <svg
                      className={`w-3.5 h-3.5 ${i === 2 ? "text-green-600" : "text-[#2563EB]"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm font-bold flex-1 transition-colors duration-500 ${
                    closeStep >= i ? (i === 2 ? "text-green-700" : "text-[#0F172A]") : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
                {/* Soft green glow badge on final step */}
                {i === 2 && closeStep >= 2 && (
                  <div
                    className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"
                    style={{ boxShadow: "0 0 8px rgba(34,197,94,0.5)", animation: "fadeSlideUp 0.4s ease forwards" }}
                  >
                    <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </div>
              {i < 2 && <div className="w-px h-3 bg-gray-200 ml-[13px]" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flow Connectors ──────────────────────────────────────────────────────────

/* Desktop 4-col arrow — visible only at xl (1280px+) */
function FlowConnector({ active, fromColor, toColor }: { active: boolean; fromColor: string; toColor: string }) {
  return (
    <div className="hidden xl:flex flex-col items-center justify-center shrink-0 w-9 relative self-center" style={{ marginTop: 56 }}>
      {/* Line */}
      <div className="absolute w-full h-0.5 bg-gray-200 overflow-hidden rounded">
        <div
          className="h-full rounded"
          style={{
            width: active ? "100%" : "0%",
            background: `linear-gradient(to right, ${fromColor}, ${toColor})`,
            transition: "width 0.8s ease",
          }}
        />
      </div>
      {/* Arrow button */}
      <div
        className="relative z-10 w-7 h-7 rounded-full bg-white shadow-md border-2 flex items-center justify-center transition-all duration-500"
        style={{
          borderColor: active ? fromColor : "#E5E7EB",
          boxShadow: active ? `0 0 10px ${fromColor}44` : "none",
        }}
      >
        <svg className="w-3.5 h-3.5" style={{ color: active ? fromColor : "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

/* Mobile single-column down arrow — hidden at md and above */
function MobileConnector({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex justify-center py-1 md:hidden">
      <svg className="w-5 h-5" style={{ color: active ? color : "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function ProcessSection() {
  const { ref, inView } = useInView(0.15);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) { const t = setTimeout(() => setStep(4), 0); return () => clearTimeout(t); }
    if (step === 0) { const t = setTimeout(() => setStep(1), 400); return () => clearTimeout(t); }
    if (step === 1) { const t = setTimeout(() => setStep(2), 2200); return () => clearTimeout(t); }
    if (step === 2) { const t = setTimeout(() => setStep(3), 3000); return () => clearTimeout(t); }
    if (step === 3) { const t = setTimeout(() => setStep(4), 4000); return () => clearTimeout(t); }
  }, [inView, step, reduced]);

  function replay() { setStep(0); setTimeout(() => setStep(1), 100); }

  const connectors = [
    { fromColor: "#2563EB", toColor: "#7C3AED", activeStep: 2 },
    { fromColor: "#7C3AED", toColor: "#FF6B6B", activeStep: 3 },
    { fromColor: "#FF6B6B", toColor: "#22C55E", activeStep: 4 },
  ];

  const cards = [
    { num: 1, accent: "#2563EB", title: "We create your ads", description: "Scroll-stopping video ads made for your audience.", visual: <Card1Visual active={step >= 1} /> },
    { num: 2, accent: "#7C3AED", title: "We run the campaigns", description: "Targeted campaigns reach the right local people.", visual: <Card2Visual active={step >= 2} /> },
    { num: 3, accent: "#FF6B6B", title: "Customers DM you", description: "Interested customers message your business directly.", visual: <Card3Visual active={step >= 3} /> },
    { num: 4, accent: "#22C55E", title: "You close them", description: "You have the conversation and close the customer.", visual: <Card4Visual active={step >= 4} /> },
  ];

  return (
    <section id="how-it-works" className="py-20 px-5 bg-white" style={{ overflowX: "clip" }}>
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            From video ad to new customer.
          </h2>
        </div>

        {/* Progress indicator */}
        <ProgressIndicator step={step} />

        {/*
          Layout strategy:
          - mobile (<768): grid 1-col with MobileConnectors between cards
          - tablet 2×2 (768–1279): grid 2-col, no connectors (progress bar communicates)
          - large desktop (1280+): flexbox row with FlowConnectors interleaved
          Hidden connectors have display:none so they don't occupy grid cells.
        */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 xl:flex xl:flex-row xl:items-stretch gap-5 xl:gap-6"
        >
          {cards.map((card, i) => (
            <React.Fragment key={card.num}>
              {/* Mobile down-arrow before each card (except first) */}
              {i > 0 && (
                <MobileConnector
                  active={step >= connectors[i - 1].activeStep}
                  color={connectors[i - 1].fromColor}
                />
              )}

              {/* Card */}
              <div className="xl:flex-1 min-w-0">
                <CardShell
                  num={card.num}
                  accent={card.accent}
                  title={card.title}
                  description={card.description}
                  active={step >= card.num}
                >
                  {card.visual}
                </CardShell>
              </div>

              {/* Desktop right-arrow after each card (except last) */}
              {i < 3 && (
                <FlowConnector
                  active={step >= connectors[i].activeStep}
                  fromColor={connectors[i].fromColor}
                  toColor={connectors[i].toColor}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Replay */}
        {step >= 4 && (
          <div className="flex justify-center mt-10" style={{ animation: "fadeIn 0.5s ease forwards" }}>
            <button
              onClick={replay}
              className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] border-2 border-[#2563EB] px-6 py-2.5 rounded-full hover:bg-[#EFF6FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
              aria-label="Replay animation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Replay
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
