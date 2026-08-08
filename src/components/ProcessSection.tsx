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

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
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
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", handler);
    };
  }, []);
  return reduced;
}

// ─── Progress Indicator ──────────────────────────────────────────────────────

function ProgressIndicator({ step }: { step: number }) {
  const dots = [
    { color: "#2563EB", glow: "rgba(37,99,235,0.4)" },
    { color: "#7C3AED", glow: "rgba(124,58,237,0.4)" },
    { color: "#FF6B6B", glow: "rgba(255,107,107,0.4)" },
    { color: "#22C55E", glow: "rgba(34,197,94,0.4)" },
  ];

  return (
    <div className="flex items-center justify-center mb-10">
      <div className="flex items-center gap-0">
        {dots.map((dot, i) => (
          <React.Fragment key={i}>
            {/* Dot */}
            <div
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white z-10 transition-all duration-500"
              style={{
                background: step >= i + 1 ? dot.color : "#E5E7EB",
                boxShadow:
                  step === i + 1 ? `0 0 0 6px ${dot.glow}` : "none",
              }}
            >
              {i + 1}
            </div>
            {/* Connector line between dots */}
            {i < 3 && (
              <div className="relative w-24 h-1 bg-gray-200 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full rounded transition-all duration-700 ease-in-out"
                  style={{
                    width: step >= i + 2 ? "100%" : "0%",
                    background: `linear-gradient(to right, ${dot.color}, ${dots[i + 1].color})`,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Card Shell ──────────────────────────────────────────────────────────────

function CardShell({
  num,
  accent,
  title,
  description,
  active,
  children,
}: {
  num: number;
  accent: string;
  title: string;
  description: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col bg-white rounded-[22px] shadow-md border-2 transition-all duration-500 overflow-hidden h-full"
      style={{
        borderColor: active ? accent : "#F3F4F6",
        boxShadow: active
          ? `0 8px 30px ${accent}22`
          : "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
            style={{ background: accent }}
          >
            {num}
          </div>
          <h3 className="text-sm font-black text-[#0F172A]">{title}</h3>
        </div>
        <p className="text-[11px] text-[#64748B] leading-snug">{description}</p>
      </div>
      {/* Visual area */}
      <div className="flex-1 px-4 pb-5">{children}</div>
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
    if (v.paused) {
      v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  const progress = Math.min((elapsed / duration) * 100, 100);

  return (
    <div
      className="bg-black rounded-[20px] overflow-hidden shadow-xl relative"
      style={{ aspectRatio: "9/16" }}
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

      {active && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
          style={{ animation: "fadeSlideUp 0.5s ease forwards" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
          Video Ready
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
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
            className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
          >
            {paused ? (
              <svg
                className="w-3 h-3 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-white text-[8px] font-mono">
              0:{String(Math.floor(elapsed % 60)).padStart(2, "0")} / 0:
              {String(duration).padStart(2, "0")}
            </span>
            <svg
              className="w-3 h-3 text-white/70"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card 2: We run the campaigns ────────────────────────────────────────────

function Card2Visual({ active }: { active: boolean }) {
  const [status, setStatus] = useState<"idle" | "preparing" | "active">(
    "idle"
  );
  const [deliveryPct, setDeliveryPct] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t0 = setTimeout(() => setStatus("preparing"), 0);
    const t1 = setTimeout(() => {
      setStatus("active");
      setMapExpanded(true);
    }, 800);
    const t2 = setTimeout(() => setDeliveryPct(75), 1200);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return (
    <div className="flex flex-col gap-2.5 bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
      {/* Top: thumbnail + status */}
      <div className="flex items-start gap-2.5">
        <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-900">
          <video
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0 transition-colors duration-500"
              style={{
                background: status === "active" ? "#22C55E" : "#9CA3AF",
              }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-wider transition-colors duration-500"
              style={{ color: status === "active" ? "#22C55E" : "#9CA3AF" }}
            >
              {status === "active"
                ? "Active"
                : status === "preparing"
                ? "Preparing..."
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] mb-1">
            <svg
              className="w-3 h-3 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"
              />
            </svg>
            <span>
              Objective:{" "}
              <strong className="text-[#0F172A]">Messages</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
            <svg
              className="w-3 h-3 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              Audience:{" "}
              <strong className="text-[#0F172A]">Local customers</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Location target map */}
      <div>
        <div className="text-[10px] text-[#64748B] font-semibold mb-1.5 uppercase tracking-wide">
          Location target
        </div>
        <div
          className="relative bg-[#EFF6FF] rounded-lg overflow-hidden"
          style={{ height: 80 }}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 200 80"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="mapGrid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#BFDBFE"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="200" height="80" fill="url(#mapGrid)" />
            <line
              x1="0"
              y1="40"
              x2="200"
              y2="40"
              stroke="#93C5FD"
              strokeWidth="1.5"
            />
            <line
              x1="100"
              y1="0"
              x2="100"
              y2="80"
              stroke="#93C5FD"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="20"
              x2="200"
              y2="20"
              stroke="#BFDBFE"
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="60"
              x2="200"
              y2="60"
              stroke="#BFDBFE"
              strokeWidth="0.8"
            />
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="80"
              stroke="#BFDBFE"
              strokeWidth="0.8"
            />
            <line
              x1="150"
              y1="0"
              x2="150"
              y2="80"
              stroke="#BFDBFE"
              strokeWidth="0.8"
            />
            <circle
              cx="100"
              cy="40"
              r={mapExpanded ? "28" : "0"}
              fill="rgba(124,58,237,0.12)"
              stroke="#7C3AED"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              style={{ transition: "r 1s ease" }}
            />
            <circle cx="100" cy="40" r="5" fill="#7C3AED" />
            <circle cx="100" cy="40" r="2" fill="white" />
          </svg>
        </div>
      </div>

      {/* Audience delivery */}
      <div>
        <div className="text-[10px] text-[#64748B] font-semibold mb-1.5 uppercase tracking-wide">
          Audience delivery
        </div>
        <div className="flex gap-1 mb-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all duration-300"
              style={{
                background:
                  (i / 10) * 100 < deliveryPct ? "#7C3AED" : "#E9D5FF",
                transitionDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
        <div className="text-[9px] text-[#64748B]">
          Reaching more local people like yours.
        </div>
      </div>
    </div>
  );
}

// ─── Card 3: Customers DM you ─────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400"
          style={{ animation: `typingDots 1.2s ease ${i * 0.2}s infinite` }}
        />
      ))}
      <span className="text-[9px] text-[#64748B] ml-1">
        Someone is typing...
      </span>
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
    const add = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.push(t);
    };

    add(() => setTyping(true), 200);
    add(() => {
      setTyping(false);
      setMsgCount(1);
    }, 900);
    add(() => setTyping(true), 1400);
    add(() => {
      setTyping(false);
      setMsgCount(2);
    }, 2100);
    add(() => setTyping(true), 2600);
    add(() => {
      setTyping(false);
      setMsgCount(3);
    }, 3300);
    add(() => setShowInquiry(true), 3800);

    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div
      className="bg-white rounded-[20px] overflow-hidden shadow-md border border-gray-200 flex flex-col"
      style={{ minHeight: 240 }}
    >
      {/* Phone status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[9px] font-semibold text-[#0F172A]">9:41</span>
        <div className="flex items-center gap-1">
          <svg
            className="w-3 h-3 text-[#0F172A]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M1.5 8.5A13 13 0 0122.5 8.5M5 12a10 10 0 0114 0M8.5 15.5a6 6 0 017 0M12 19h.01" />
          </svg>
          <svg
            className="w-3 h-2.5 text-[#0F172A]"
            fill="none"
            viewBox="0 0 24 16"
          >
            <rect
              x="0"
              y="3"
              width="20"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <rect x="20" y="6" width="4" height="4" rx="1" fill="currentColor" />
            <rect x="1" y="4" width="14" height="8" rx="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Inbox header */}
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-sm font-black text-[#0F172A]">Inbox</span>
        <div className="flex gap-2">
          <svg
            className="w-4 h-4 text-[#64748B]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <svg
            className="w-4 h-4 text-[#64748B]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Message rows */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {MESSAGES.slice(0, msgCount).map((msg, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50"
            style={{ animation: "messageSlideIn 0.4s ease forwards" }}
          >
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.avatar}
                alt={msg.name}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-black text-[#0F172A]">
                  {msg.name}
                </span>
                <span className="text-[9px] text-[#64748B]">{msg.time}</span>
              </div>
              <p className="text-[10px] text-[#64748B] truncate">{msg.text}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
          </div>
        ))}

        {typing && <TypingIndicator />}
      </div>

      {/* NEW INQUIRY button */}
      {showInquiry && (
        <div
          className="px-4 py-3"
          style={{ animation: "badgePop 0.4s ease forwards" }}
        >
          <button className="w-full flex items-center justify-center gap-2 bg-[#FF6B6B] text-white text-[10px] font-black uppercase tracking-wider rounded-full py-2">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            New Inquiry
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card 4: You close them ───────────────────────────────────────────────────

const CLOSE_STATUSES = [
  { label: "New inquiry" },
  { label: "Call scheduled" },
  { label: "New customer" },
];

function Card4Visual({ active }: { active: boolean }) {
  const [closeStep, setCloseStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setCloseStep(1), 600);
    const t2 = setTimeout(() => setCloseStep(2), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return (
    <div
      className="relative rounded-[18px] overflow-hidden"
      style={{ minHeight: 220 }}
    >
      {/* Background photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PEOPLE_IMG}
        alt="Business owner on phone"
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/40" />

      {/* Status overlay card */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 w-[130px]">
        {CLOSE_STATUSES.map((s, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 py-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                  closeStep >= i
                    ? i === 2
                      ? "border-green-500 bg-green-50"
                      : "border-[#2563EB] bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {closeStep >= i && (
                  <svg
                    className={`w-2.5 h-2.5 ${
                      i === 2 ? "text-green-600" : "text-[#2563EB]"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span
                className={`text-[9px] font-bold transition-colors duration-500 ${
                  closeStep >= i
                    ? i === 2
                      ? "text-green-700"
                      : "text-[#0F172A]"
                    : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div className="w-px h-3 bg-gray-200 ml-[11px]" />
            )}
          </div>
        ))}
      </div>

      {/* Big animated checkmark bottom-right */}
      <div className="absolute bottom-4 right-4">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="white"
            fillOpacity="0.15"
            stroke="#22C55E"
            strokeWidth="3"
          />
          <path
            d="M18 28l7 8 14-14"
            fill="none"
            stroke="#22C55E"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 40,
              strokeDashoffset: closeStep >= 2 ? 0 : 40,
              transition: "stroke-dashoffset 0.8s ease 0.3s",
            }}
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Flow Connectors ──────────────────────────────────────────────────────────

function FlowConnector({
  active,
  fromColor,
  toColor,
}: {
  active: boolean;
  fromColor: string;
  toColor: string;
}) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center shrink-0 w-10 relative">
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
      {/* Circular arrow button */}
      <div
        className="relative z-10 w-8 h-8 rounded-full bg-white shadow-md border-2 flex items-center justify-center transition-all duration-500"
        style={{
          borderColor: active ? fromColor : "#E5E7EB",
          boxShadow: active ? `0 0 12px ${fromColor}44` : "none",
        }}
      >
        <svg
          className="w-4 h-4"
          style={{ color: active ? fromColor : "#D1D5DB" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}

function MobileConnector({
  active,
  color,
}: {
  active: boolean;
  color: string;
}) {
  return (
    <div className="lg:hidden flex justify-center py-1">
      <svg
        className="w-6 h-6"
        style={{ color: active ? color : "#D1D5DB" }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 9l-7 7-7-7"
        />
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
    if (reduced) {
      const t = setTimeout(() => setStep(4), 0);
      return () => clearTimeout(t);
    }
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 400);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 2200);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => setStep(3), 3000);
      return () => clearTimeout(t);
    }
    if (step === 3) {
      const t = setTimeout(() => setStep(4), 4000);
      return () => clearTimeout(t);
    }
  }, [inView, step, reduced]);

  function replay() {
    setStep(0);
    setTimeout(() => setStep(1), 100);
  }

  const connectors = [
    { fromColor: "#2563EB", toColor: "#7C3AED", activeStep: 2 },
    { fromColor: "#7C3AED", toColor: "#FF6B6B", activeStep: 3 },
    { fromColor: "#FF6B6B", toColor: "#22C55E", activeStep: 4 },
  ];

  const cards = [
    {
      num: 1,
      accent: "#2563EB",
      title: "We create your ads",
      description: "Scroll-stopping video ads made for your audience.",
      visual: <Card1Visual active={step >= 1} />,
    },
    {
      num: 2,
      accent: "#7C3AED",
      title: "We run the campaigns",
      description: "Targeted campaigns reach the right people.",
      visual: <Card2Visual active={step >= 2} />,
    },
    {
      num: 3,
      accent: "#FF6B6B",
      title: "Customers DM you",
      description: "Interested customers message your business directly.",
      visual: <Card3Visual active={step >= 3} />,
    },
    {
      num: 4,
      accent: "#22C55E",
      title: "You close them",
      description: "You have the conversation and close the customer.",
      visual: <Card4Visual active={step >= 4} />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            From video ad to new customer.
          </h2>
        </div>

        {/* Progress indicator */}
        <ProgressIndicator step={step} />

        {/* Cards row with connectors */}
        <div
          ref={ref}
          className="flex flex-col lg:flex-row items-stretch gap-4"
        >
          {cards.map((card, i) => (
            <React.Fragment key={card.num}>
              <div className="flex-1 min-w-0">
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
              {/* Mobile connector after each card except last */}
              {i < 3 && (
                <MobileConnector
                  active={step >= connectors[i].activeStep}
                  color={connectors[i].fromColor}
                />
              )}
              {/* Desktop connector */}
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

        {/* Replay button */}
        {step >= 4 && (
          <div
            className="flex justify-center mt-10"
            style={{ animation: "fadeIn 0.5s ease forwards" }}
          >
            <button
              onClick={replay}
              className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] border-2 border-[#2563EB] px-6 py-2.5 rounded-full hover:bg-[#EFF6FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
              aria-label="Replay animation"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Replay
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
