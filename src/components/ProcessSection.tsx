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

// ─── Card 1 Visual ──────────────────────────────────────────────────────────
function Card1Visual({ active }: { active: boolean }) {
  return (
    <div className="relative w-full" style={{ height: 200 }}>
      <div className="w-full h-full rounded-xl overflow-hidden relative">
        <video
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
      </div>
      {active && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 shadow-md text-xs font-semibold text-gray-800"
          style={{ animation: "fadeIn 0.4s ease forwards" }}
        >
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          VIDEO READY
        </div>
      )}
    </div>
  );
}

// ─── Card 2 Visual ──────────────────────────────────────────────────────────
function Card2Visual({ active }: { active: boolean }) {
  const [status, setStatus] = useState<"idle" | "preparing" | "active">("idle");
  const [msgCount, setMsgCount] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t0 = setTimeout(() => setStatus("preparing"), 0);
    const t1 = setTimeout(() => setStatus("active"), 600);

    // Count 0 -> 24 over 1200ms
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setMsgCount(current);
      if (current >= 24) clearInterval(interval);
    }, 1200 / 24);

    // Progress bar: animate via state
    const t2 = setTimeout(() => setProgress(100), 50);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [active]);

  return (
    <div
      className="w-full rounded-xl bg-white border border-gray-100 p-3"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {status === "active" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-xs font-semibold text-green-600">Active</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-gray-500">
                {status === "preparing" ? "Preparing..." : ""}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Objective: Messages</div>
          <div className="text-[10px] text-gray-500">Audience: Local area</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded-full"
          style={{
            width: `${progress}%`,
            transition: "width 1.5s ease",
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">Messages</span>
        <span className="text-sm font-black text-[#2563EB]">{msgCount}</span>
      </div>

      {/* Mini SVG sparkline */}
      <svg viewBox="0 0 80 24" className="w-full mt-2" fill="none">
        <polyline
          points="0,20 20,14 40,10 60,6 80,2"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 120,
            strokeDashoffset: active ? 0 : 120,
            transition: "stroke-dashoffset 1.2s ease",
          }}
        />
      </svg>
    </div>
  );
}

// ─── Card 3 Visual ──────────────────────────────────────────────────────────
const MESSAGES = [
  "I'm interested in your services.",
  "Can I get a quote?",
  "Do you have availability this week?",
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-3 py-2 bg-gray-100 rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"
          style={{
            animation: `typingDots 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Card3Visual({ active }: { active: boolean }) {
  const [msgCount, setMsgCount] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!active) return;
    const tReset1 = setTimeout(() => setMsgCount(0), 0);
    const tReset2 = setTimeout(() => setTyping(false), 0);

    const show = (idx: number, delay: number) => {
      const tTyping = setTimeout(() => setTyping(true), delay - 400 < 0 ? 0 : delay - 400);
      const tMsg = setTimeout(() => {
        setMsgCount(idx + 1);
        setTyping(false);
      }, delay);
      return [tTyping, tMsg];
    };

    const timers = [
      tReset1,
      tReset2,
      ...show(0, 400),
      ...show(1, 1200),
      ...show(2, 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="w-full bg-gray-50 rounded-xl p-3 min-h-[160px]">
      <div className="flex flex-col gap-2">
        {MESSAGES.slice(0, msgCount).map((msg, i) => (
          <div
            key={i}
            className="bg-[#DBEAFE] rounded-2xl rounded-tl-sm px-3 py-2 w-fit max-w-[90%]"
            style={{ animation: "messageSlideIn 0.3s ease forwards" }}
          >
            <span className="text-xs text-[#0F172A] font-medium">{msg}</span>
          </div>
        ))}
        {typing && <TypingDots />}
      </div>
      {msgCount === 3 && (
        <div
          className="mt-3 flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-2.5 py-1 w-fit text-xs font-semibold text-gray-700 shadow-sm"
          style={{ animation: "badgePop 0.4s ease forwards" }}
        >
          <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          New inquiry
        </div>
      )}
    </div>
  );
}

// ─── Card 4 Visual ──────────────────────────────────────────────────────────
const CLOSE_STATES = [
  { label: "New inquiry", color: "text-gray-600 bg-gray-100" },
  { label: "Call scheduled", color: "text-blue-600 bg-blue-100" },
  { label: "New customer", color: "text-green-600 bg-green-100" },
];

function Card4Visual({ active }: { active: boolean }) {
  const [closeState, setCloseState] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t0 = setTimeout(() => setCloseState(0), 0);
    const t1 = setTimeout(() => setCloseState(1), 600);
    const t2 = setTimeout(() => setCloseState(2), 1200);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const state = CLOSE_STATES[closeState] ?? CLOSE_STATES[0];

  return (
    <div
      className={`w-full rounded-xl p-4 flex flex-col items-center gap-4 transition-colors duration-500 ${closeState === 2 ? "bg-green-50" : "bg-white border border-gray-100"}`}
    >
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors duration-500 ${state.color}`}
        style={{ animation: "fadeIn 0.3s ease" }}
        key={closeState}
      >
        {state.label}
      </span>

      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#22C55E" strokeWidth="2.5" />
        <path
          d="M14 24l7 7 11-11"
          fill="none"
          stroke="#22C55E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 60,
            strokeDashoffset: closeState >= 2 ? 0 : 60,
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
      </svg>
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
            step >= n
              ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
              : "bg-gray-100 text-gray-400"
          }`}
          style={
            step === n
              ? { animation: "pulseGlow 2s ease infinite" }
              : {}
          }
        >
          {n}
        </div>
      ))}
    </div>
  );
}

// ─── Card border helper ──────────────────────────────────────────────────────
function cardBorder(step: number, cardStep: number): string {
  if (step === cardStep) {
    if (cardStep === 1) return "border-[#2563EB] shadow-lg shadow-blue-100";
    if (cardStep === 2) return "border-[#7C3AED] shadow-lg shadow-violet-100";
    if (cardStep === 3) return "border-[#FF6B6B] shadow-lg shadow-red-100";
    if (cardStep === 4) return "border-green-500 shadow-lg shadow-green-100";
  }
  return "border-gray-100";
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProcessSection() {
  const { ref, inView } = useInView(0.2);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setTimeout(() => setStep(4), 0); return; }
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 300);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 2000);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => setStep(3), 2500);
      return () => clearTimeout(t);
    }
    if (step === 3) {
      const t = setTimeout(() => setStep(4), 2500);
      return () => clearTimeout(t);
    }
  }, [inView, step, reduced]);

  function replay() {
    setStep(0);
    setTimeout(() => setStep(1), 50);
  }

  const cards = [
    {
      num: 1,
      title: "We create your ads",
      description: "Scroll-stopping video ads made for your audience.",
      visual: <Card1Visual active={step >= 1} />,
    },
    {
      num: 2,
      title: "We run the campaigns",
      description: "Targeted Meta campaigns put your business in front of the right people.",
      visual: <Card2Visual active={step >= 2} />,
    },
    {
      num: 3,
      title: "Customers DM you",
      description: "Interested customers message your business directly.",
      visual: <Card3Visual active={step >= 3} />,
    },
    {
      num: 4,
      title: "You close them",
      description: "You have the conversation and close the customer.",
      visual: <Card4Visual active={step >= 4} />,
    },
  ];

  const accentColors = [
    { dot: "bg-[#2563EB]", text: "text-[#2563EB]" },
    { dot: "bg-[#7C3AED]", text: "text-[#7C3AED]" },
    { dot: "bg-[#FF6B6B]", text: "text-[#FF6B6B]" },
    { dot: "bg-green-500", text: "text-green-600" },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            From video ad to new customer.
          </h2>
        </div>

        <StepIndicator step={step} />

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <div
              key={card.num}
              className={`bg-white rounded-2xl shadow-md p-6 border-2 transition-all duration-500 ${cardBorder(step, card.num)}`}
              style={{
                opacity: step >= card.num - 1 || i === 0 ? 1 : 0.5,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`${accentColors[i].dot} text-white text-sm font-black w-8 h-8 rounded-full flex items-center justify-center shrink-0`}
                >
                  {card.num}
                </span>
                <h3 className="text-lg font-bold text-[#0F172A]">{card.title}</h3>
              </div>
              <p className="text-[#64748B] text-sm mb-4">{card.description}</p>
              {card.visual}
            </div>
          ))}
        </div>

        {step === 4 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={replay}
              className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] border border-[#2563EB] px-5 py-2 rounded-full hover:bg-[#EFF6FF] transition-colors"
              style={{ animation: "fadeIn 0.4s ease forwards" }}
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
