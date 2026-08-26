"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "jordan" | "user";
interface Msg { role: Role; text: string; }

type Step =
  | "opening"
  | "ai_phone"
  | "ai_phone_how"
  | "ai_phone_book"
  | "ai_phone_cost"
  | "name" | "phone" | "email" | "business" | "website"
  | "saving" | "done" | "error";

interface Answers {
  full_name: string;
  phone: string;
  email: string;
  business_name: string;
  website: string;
}
const EMPTY: Answers = { full_name: "", phone: "", email: "", business_name: "", website: "" };

const JORDAN_PHOTO =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Jordan%20Profile.PNG";

const OPENING_OPTIONS = [
  "Get more customers",
  "Get more DM conversations",
  "AI Employee",
  "Run better ads",
  "Not sure yet",
];

const AI_PHONE_OPTIONS = [
  "How does it work?",
  "Can it book appointments?",
  "How much does it cost?",
  "I want a demo",
];

const DEMO_OPTION = ["I want a demo"];
const BOOK_OPTION = ["Book a Demo"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bump version key when step types change to avoid stale state
const SK = "cd_chat_v3";

function loadSession(): { messages: Msg[]; step: Step; answers: Answers } | null {
  try {
    const raw = sessionStorage.getItem(SK);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSession(messages: Msg[], step: Step, answers: Answers) {
  try { sessionStorage.setItem(SK, JSON.stringify({ messages, step, answers })); } catch { /* noop */ }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-[#F0F0EC] rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#A3A3A0]"
          style={{ animation: `chatDot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

// ─── Quick reply options by step ─────────────────────────────────────────────

function getQuickOptions(step: Step): string[] | null {
  switch (step) {
    case "opening":      return OPENING_OPTIONS;
    case "ai_phone":     return AI_PHONE_OPTIONS;
    case "ai_phone_how": return DEMO_OPTION;
    case "ai_phone_book":return DEMO_OPTION;
    case "ai_phone_cost":return BOOK_OPTION;
    default:             return null;
  }
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep]         = useState<Step>("opening");
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [validErr, setValidErr] = useState("");
  const [unread, setUnread]     = useState(false);

  const answersRef = useRef<Answers>(EMPTY);
  function updateAnswers(patch: Partial<Answers>) {
    answersRef.current = { ...answersRef.current, ...patch };
  }

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Jordan say helper ─────────────────────────────────────────────────────
  const jordanSay = useCallback((texts: string[], onDone?: () => void) => {
    setTyping(true);
    let i = 0;
    const next = () => {
      if (i >= texts.length) { setTyping(false); onDone?.(); return; }
      const text = texts[i++];
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "jordan", text }]);
        setTimeout(next, i < texts.length ? 500 : 0);
      }, 650);
    };
    next();
  }, []);

  // ── Intro ─────────────────────────────────────────────────────────────────
  const startIntro = useCallback(() => {
    jordanSay(
      ["Hey — I'm Jordan. What are you looking for help with?"],
      () => setStep("opening"),
    );
  }, [jordanSay]);

  // ── Restore session ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSession();
    if (saved?.messages?.length) {
      answersRef.current = saved.answers;
      const timer = setTimeout(() => {
        setMessages(saved.messages);
        setStep(saved.step as Step);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) saveSession(messages, step, answersRef.current);
  }, [messages, step]);

  // ── Open / focus ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const introTimer = messages.length === 0 ? setTimeout(startIntro, 0) : null;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      if (introTimer) clearTimeout(introTimer);
      clearTimeout(focusTimer);
    };
  }, [open, messages.length, startIntro]);

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Kick off name/phone/email lead collection ─────────────────────────────
  const startLeadCapture = useCallback((greeting: string) => {
    jordanSay([greeting], () => setStep("name"));
  }, [jordanSay]);

  // ── Validate ──────────────────────────────────────────────────────────────
  function validate(value: string): string {
    if (!value.trim()) return "Please enter a response.";
    if (step === "email" && !EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
    return "";
  }

  // ── Save lead ─────────────────────────────────────────────────────────────
  async function saveLead(a: Answers) {
    setStep("saving");
    setTyping(true);

    let website = a.website.trim();
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name:     a.full_name,
          phone:         a.phone,
          email:         a.email,
          business_name: a.business_name,
          website,
          source: "Website Chat",
        }),
      });

      setTyping(false);

      if (res.ok) {
        setStep("done");
        jordanSay([
          "Thanks — I've got your information.",
          "The next step is to book a strategy call so we can talk about your business and build your plan.",
        ]);
      } else {
        setStep("error");
        jordanSay(["Sorry, something went wrong. Please try again or use the form below."]);
      }
    } catch {
      setTyping(false);
      setStep("error");
      jordanSay(["Sorry, there was a connection issue. Please try the form below."]);
    }
  }

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = useCallback((value: string) => {
    const err = validate(value.trim());
    if (err) { setValidErr(err); return; }
    setValidErr("");
    setInput("");
    const v = value.trim();

    setMessages(prev => [...prev, { role: "user", text: v }]);

    switch (step) {
      // ── Opening ────────────────────────────────────────────────────────
      case "opening":
        if (v === "AI Employee") {
          jordanSay([
            "Our AI Employee works alongside your staff so every call gets answered. It can handle after-hours and overflow calls, answer common questions, capture and qualify leads, and book appointments while you keep your existing business number.",
          ], () => setStep("ai_phone"));
        } else {
          jordanSay(["Got it. I just need a few details. What's your name?"], () => setStep("name"));
        }
        break;

      // ── AI Employee menu ──────────────────────────────────────────────────
      case "ai_phone":
        if (v === "How does it work?") {
          jordanSay([
            "We set up an AI Employee specifically for your business. It answers incoming calls when your team is unavailable, talks naturally with customers, answers common questions, captures and qualifies their information, and can route or book leads.",
          ], () => setStep("ai_phone_how"));
        } else if (v === "Can it book appointments?") {
          jordanSay([
            "Yes. Your AI Employee can collect customer information and book appointments based on your business's availability and rules.",
          ], () => setStep("ai_phone_book"));
        } else if (v === "How much does it cost?") {
          jordanSay([
            "Pricing depends on your business, call volume, and what you want your AI Employee to handle. We can show you exactly how it would work for your business on a quick demo.",
          ], () => setStep("ai_phone_cost"));
        } else {
          // "I want a demo"
          startLeadCapture("Great! I just need a few details. What's your name?");
        }
        break;

      // ── AI Employee sub-steps → all lead to demo ──────────────────────────
      case "ai_phone_how":
      case "ai_phone_book":
      case "ai_phone_cost":
        startLeadCapture("Perfect. Let me grab your details. What's your name?");
        break;

      // ── Lead capture ───────────────────────────────────────────────────
      case "name":
        updateAnswers({ full_name: v });
        jordanSay([`Nice to meet you, ${v.split(" ")[0]}. What's the best phone number to reach you?`], () => setStep("phone"));
        break;
      case "phone":
        updateAnswers({ phone: v });
        jordanSay(["What's your email address?"], () => setStep("email"));
        break;
      case "email":
        updateAnswers({ email: v });
        jordanSay(["What's the name of your business?"], () => setStep("business"));
        break;
      case "business":
        updateAnswers({ business_name: v });
        jordanSay(["What's your business website?"], () => setStep("website"));
        break;
      case "website":
        updateAnswers({ website: v });
        saveLead({ ...answersRef.current, website: v });
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, jordanSay, startLeadCapture]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    try { sessionStorage.removeItem(SK); } catch { /* noop */ }
    answersRef.current = EMPTY;
    setMessages([]); setStep("opening");
    setInput(""); setValidErr(""); setTyping(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(input); }
  }

  const quickOptions = getQuickOptions(step);
  const showQuick  = !typing && quickOptions !== null;
  const showInput  = !typing && quickOptions === null && step !== "saving" && step !== "done" && step !== "error";

  return (
    <>
      <style>{`
        @keyframes chatDot {
          0%,60%,100%{transform:translateY(0);opacity:.4}
          30%{transform:translateY(-4px);opacity:1}
        }
        @keyframes chatSlideUp {
          from{opacity:0;transform:translateY(16px)}
          to{opacity:1;transform:translateY(0)}
        }
      `}</style>

      {/* ── Launcher ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(v => !v); setUnread(false); }}
        aria-label={open ? "Close chat" : "Chat with Jordan"}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 rounded-full group"
      >
        <div
          className="relative w-14 h-14 rounded-full bg-[#171717] flex items-center justify-center text-white ring-2 ring-white transition-all duration-200 group-hover:scale-[1.05] group-hover:bg-[#2A2A2A] group-hover:shadow-2xl"
          style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.22)" }}
        >
          {open
            ? <IconX />
            : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )}
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
          {unread && (
            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white text-[8px] text-white font-black flex items-center justify-center">!</span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-[#171717] leading-none select-none tracking-tight">Chat</span>
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Jordan"
          className={[
            "fixed z-50 bg-white border border-gray-200 flex flex-col shadow-2xl overflow-hidden",
            "sm:bottom-[88px] sm:right-6 sm:left-auto sm:w-[380px] sm:max-h-[75vh] sm:rounded-2xl",
            "bottom-0 left-0 right-0 rounded-t-2xl",
          ].join(" ")}
          style={{
            animation: "chatSlideUp 0.25s ease forwards",
            maxHeight: "min(90dvh, 90vh)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={JORDAN_PHOTO} alt="Jordan"
                className="w-10 h-10 rounded-full object-cover object-center border border-gray-100" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#171717] text-sm leading-tight">Jordan</p>
              <p className="text-xs text-[#777773]">Customers.Direct &nbsp;·&nbsp; Here to help</p>
            </div>
            <button onClick={reset} aria-label="Restart chat" title="Start over"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#64748B] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button onClick={() => setOpen(false)} aria-label="Close chat"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#64748B] transition-colors">
              <IconX />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: "chatSlideUp 0.2s ease forwards" }}>
                <div className={[
                  "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  m.role === "jordan"
                    ? "bg-[#F0F0EC] text-[#171717] rounded-tl-sm"
                    : "bg-[#171717] text-white rounded-tr-sm",
                ].join(" ")}>
                  {m.text}
                </div>
              </div>
            ))}

            {typing && <div className="flex justify-start"><TypingDots /></div>}

            {/* Done — CTA */}
            {step === "done" && !typing && (
              <div className="flex justify-center mt-2" style={{ animation: "chatSlideUp 0.3s ease forwards" }}>
                <a href="https://calendar.app.google/muM2Kqc8oYnWBPXXA" target="_blank" rel="noopener noreferrer"
                  className="w-full bg-[#171717] text-white font-bold text-sm text-center py-3.5 px-6 rounded-full hover:bg-[#2A2A2A] transition-colors shadow-md">
                  Book a Strategy Call
                </a>
              </div>
            )}

            {/* Error — restart */}
            {step === "error" && !typing && (
              <button onClick={reset} className="text-xs text-[#777773] underline mt-1 self-center">
                Start over
              </button>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {showQuick && (
            <div
              className="px-4 pt-3 flex flex-wrap gap-2 shrink-0 border-t border-gray-100 bg-white"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            >
              {quickOptions!.map(opt => (
                <button key={opt} onClick={() => submitAnswer(opt)}
                  className="text-sm font-medium bg-[#F5F5F2] hover:bg-[#EFEFEB] active:bg-[#EFEFEB] border border-[#E5E5E1] hover:border-[#D4D4CF] text-[#171717] px-4 py-2.5 rounded-full transition-colors active:scale-[0.97]">
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          {showInput && (
            <div
              className="px-4 pt-3 shrink-0 border-t border-gray-100 bg-white"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            >
              {validErr && <p className="text-xs text-red-500 mb-1.5">{validErr}</p>}
              <div className="flex items-center gap-2 w-full">
                <input
                  ref={inputRef}
                  type={step === "email" ? "email" : step === "phone" ? "tel" : step === "website" ? "url" : "text"}
                  value={input}
                  onChange={e => { setInput(e.target.value); setValidErr(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    step === "name"     ? "Your full name" :
                    step === "phone"    ? "(555) 000-0000" :
                    step === "email"    ? "you@example.com" :
                    step === "business" ? "Business name" :
                    step === "website"  ? "yourwebsite.com" :
                    "Type your answer…"
                  }
                  className="min-w-0 flex-1 border border-[#E5E5E1] rounded-xl px-3.5 py-3 text-base text-[#171717] placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/20 transition"
                />
                <button
                  onClick={() => submitAnswer(input)}
                  aria-label="Send"
                  className="w-11 h-11 bg-[#171717] rounded-xl flex items-center justify-center text-white hover:bg-[#2A2A2A] active:scale-[0.95] transition-all shrink-0"
                >
                  <IconSend />
                </button>
              </div>
            </div>
          )}

          {step === "saving" && (
            <div
              className="px-4 pt-2 shrink-0 text-center text-xs text-[#94A3B8] bg-white"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            >
              Saving your information…
            </div>
          )}
        </div>
      )}
    </>
  );
}
