"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "jordan" | "user";
interface Msg { role: Role; text: string; }

type Step = "opening" | "name" | "phone" | "email" | "business" | "website" | "saving" | "done" | "error";

// Matches the existing lead form exactly — no extra fields
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
  "Run better ads",
  "Get more DM conversations",
  "Not sure yet",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bump version key to clear old corrupt sessionStorage
const SK = "cd_chat_v2";

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
    <div className="flex items-center gap-1 px-4 py-3 bg-[#F1F5F9] rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
          style={{ animation: `chatDot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep]       = useState<Step>("opening");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [validErr, setValidErr] = useState("");
  const [unread, setUnread]   = useState(false);

  // ── Ref mirrors answers synchronously — avoids stale-closure bug ──────────
  const answersRef = useRef<Answers>(EMPTY);
  function updateAnswers(patch: Partial<Answers>) {
    answersRef.current = { ...answersRef.current, ...patch };
    setAnswers({ ...answersRef.current });
  }

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // ── Restore session ───────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSession();
    if (saved?.messages?.length) {
      setMessages(saved.messages);
      setStep(saved.step as Step);
      answersRef.current = saved.answers;
      setAnswers(saved.answers);
    }
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) saveSession(messages, step, answersRef.current);
  }, [messages, step]);

  // ── Start intro when first opened ─────────────────────────────────────────
  useEffect(() => {
    if (open && messages.length === 0) startIntro();
    if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 300); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Add Jordan messages with typing pause between each ────────────────────
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

  // ── Validate ──────────────────────────────────────────────────────────────
  function validate(value: string): string {
    if (!value.trim()) return "Please enter a response.";
    if (step === "email" && !EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
    return "";
  }

  // ── Submit answer (uses ref — never stale) ────────────────────────────────
  const submitAnswer = useCallback((value: string) => {
    const err = validate(value.trim());
    if (err) { setValidErr(err); return; }
    setValidErr("");
    setInput("");
    const v = value.trim();

    setMessages(prev => [...prev, { role: "user", text: v }]);

    switch (step) {
      case "opening":
        // Opening answer is conversational context only — not saved to DB
        jordanSay([`Got it. I just need a few details. What's your name?`], () => setStep("name"));
        break;
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
        // Read from ref — guaranteed fresh regardless of React batching
        saveLead({ ...answersRef.current, website: v });
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, jordanSay]);

  // ── Save lead — same API + payload as the existing lead form ──────────────
  async function saveLead(a: Answers) {
    setStep("saving");
    setTyping(true);

    // Normalise website protocol exactly as the existing form does
    let website = a.website.trim();
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Payload matches the existing lead form exactly, plus optional source
        body: JSON.stringify({
          full_name:     a.full_name,
          phone:         a.phone,
          email:         a.email,
          business_name: a.business_name,
          website,
          source:        "Website Chat",   // optional field added in migration 003
        }),
      });

      setTyping(false);

      if (res.ok) {
        setStep("done");
        jordanSay([
          "Thanks — I've got your information.",
          "The next step is to book a strategy call so we can talk about your business and build your customer acquisition plan.",
        ]);
      } else {
        const body = await res.json().catch(() => ({}));
        console.error("Chat lead save error:", body);
        setStep("error");
        jordanSay(["Sorry, something went wrong. Please try again or use the form below."]);
      }
    } catch (err) {
      console.error("Chat lead network error:", err);
      setTyping(false);
      setStep("error");
      jordanSay(["Sorry, there was a connection issue. Please try the form below."]);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    try { sessionStorage.removeItem(SK); } catch { /* noop */ }
    answersRef.current = EMPTY;
    setMessages([]); setStep("opening"); setAnswers(EMPTY);
    setInput(""); setValidErr(""); setTyping(false);
    setTimeout(() => startIntro(), 80);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(input); }
  }

  const showInput  = !typing && step !== "opening" && step !== "saving" && step !== "done" && step !== "error";
  const showQuick  = !typing && step === "opening";

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
        className="fixed bottom-5 right-6 z-50 flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded-full group"
        style={{ bottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}
      >
        <div
          className="relative w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-[#2563EB] flex items-center justify-center text-white ring-2 ring-white transition-all duration-200 group-hover:scale-[1.04] group-hover:shadow-2xl"
          style={{ boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
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
        <span className="text-[13px] font-bold text-[#0F172A] leading-none select-none">Chat</span>
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Jordan"
          className={[
            "fixed z-50 bg-white border border-gray-200 flex flex-col shadow-2xl overflow-hidden",
            // Desktop — panel above launcher, right-aligned
            "sm:bottom-[72px] sm:right-5 sm:left-auto sm:w-[380px] sm:max-h-[75vh] sm:rounded-2xl",
            // Mobile — full-width bottom sheet, shrinks with keyboard via dvh
            "bottom-0 left-0 right-0 rounded-t-2xl",
          ].join(" ")}
          style={{
            animation: "chatSlideUp 0.25s ease forwards",
            // dvh = dynamic viewport height — shrinks when software keyboard appears
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
              <p className="font-bold text-[#0F172A] text-sm leading-tight">Jordan</p>
              <p className="text-xs text-[#64748B]">Customers.Direct &nbsp;·&nbsp; Here to help</p>
            </div>
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
                    ? "bg-[#F1F5F9] text-[#0F172A] rounded-tl-sm"
                    : "bg-[#2563EB] text-white rounded-tr-sm",
                ].join(" ")}>
                  {m.text}
                </div>
              </div>
            ))}

            {typing && <div className="flex justify-start"><TypingDots /></div>}

            {/* Done — CTA */}
            {step === "done" && !typing && (
              <div className="flex justify-center mt-2" style={{ animation: "chatSlideUp 0.3s ease forwards" }}>
                <a href="https://calendar.app.google/SZmANmexmVxVt6BH8" target="_blank" rel="noopener noreferrer"
                  className="w-full bg-[#2563EB] text-white font-bold text-sm text-center py-3.5 px-6 rounded-full hover:bg-[#1d4ed8] transition-colors shadow-md">
                  Book a Strategy Call
                </a>
              </div>
            )}

            {/* Error — restart */}
            {step === "error" && !typing && (
              <button onClick={reset} className="text-xs text-[#2563EB] underline mt-1 self-center">
                Start over
              </button>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Opening quick replies */}
          {showQuick && (
            <div
              className="px-4 pt-3 flex flex-wrap gap-2 shrink-0 border-t border-gray-100 bg-white"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            >
              {OPENING_OPTIONS.map(opt => (
                <button key={opt} onClick={() => submitAnswer(opt)}
                  className="text-sm font-medium bg-[#F1F5F9] hover:bg-[#DBEAFE] active:bg-[#DBEAFE] border border-gray-200 hover:border-[#BFDBFE] text-[#0F172A] px-4 py-2.5 rounded-full transition-colors">
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
                  className="min-w-0 flex-1 border border-gray-200 rounded-xl px-3.5 py-3 text-base text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                />
                <button
                  onClick={() => submitAnswer(input)}
                  aria-label="Send"
                  className="w-11 h-11 bg-[#2563EB] rounded-xl flex items-center justify-center text-white hover:bg-[#1d4ed8] active:bg-[#1e40af] transition-colors shrink-0"
                >
                  <IconSend />
                </button>
              </div>
            </div>
          )}

          {/* Quick replies — safe area bottom padding */}
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
