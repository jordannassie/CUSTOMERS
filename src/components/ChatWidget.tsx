"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "jordan" | "user";
interface Msg { role: Role; text: string; }

type Step =
  | "intro"
  | "name" | "phone" | "email" | "business" | "website"
  | "type" | "goal"
  | "saving" | "done" | "error";

interface Answers {
  full_name: string;
  phone: string;
  email: string;
  business_name: string;
  website: string;
  business_type: string;
  goal: string;
}

const EMPTY: Answers = { full_name: "", phone: "", email: "", business_name: "", website: "", business_type: "", goal: "" };

const JORDAN_PHOTO = "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Jordan%20Profile.PNG";

const BUSINESS_TYPES = ["Med Spa / Aesthetics", "Roofing", "Real Estate", "Law Firm", "Fitness / Gym", "Auto", "Other"];
const GOALS = ["Get more customers", "Get more leads", "Get more DM conversations", "Improve my ads", "Not sure yet"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Storage key ──────────────────────────────────────────────────────────────
const SK = "cd_chat_v1";

function load(): { messages: Msg[]; step: Step; answers: Answers } | null {
  try {
    const raw = sessionStorage.getItem(SK);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function save(messages: Msg[], step: Step, answers: Answers) {
  try { sessionStorage.setItem(SK, JSON.stringify({ messages, step, answers })); } catch { /* noop */ }
}

// ─── Lucide inline icons ──────────────────────────────────────────────────────

function IconMessage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
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

// ─── Typing dots ─────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-[#F1F5F9] rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
          style={{ animation: `chatDot 1.2s ${i * 0.2}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [validationErr, setValidationErr] = useState("");
  const [unread, setUnread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load from sessionStorage on mount ──────────────────────────────────────
  useEffect(() => {
    const saved = load();
    if (saved && saved.messages.length > 0) {
      setMessages(saved.messages);
      setStep(saved.step);
      setAnswers(saved.answers);
    }
  }, []);

  // ── Persist on change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) save(messages, step, answers);
  }, [messages, step, answers]);

  // ── Start intro when first opened ─────────────────────────────────────────
  useEffect(() => {
    if (open && messages.length === 0) {
      startIntro();
    }
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Add a Jordan message with a delay ────────────────────────────────────
  const jordanSay = useCallback((texts: string[], onDone?: () => void) => {
    setTyping(true);
    let i = 0;
    const next = () => {
      if (i >= texts.length) { setTyping(false); onDone?.(); return; }
      const text = texts[i++];
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "jordan", text }]);
        setTimeout(next, i < texts.length ? 600 : 0);
      }, i === 1 ? 700 : 500);
    };
    next();
  }, []);

  // ── Intro sequence ────────────────────────────────────────────────────────
  const startIntro = useCallback(() => {
    jordanSay(
      [
        "Hey — I'm Jordan. I can help you figure out if Customers Direct is a fit for your business.",
        "I just need a few quick details.",
        "What's your name?",
      ],
      () => setStep("name"),
    );
  }, [jordanSay]);

  // ── Validate current input before advancing ───────────────────────────────
  function validate(value: string): string {
    if (!value.trim()) return "Please enter a response.";
    if (step === "email" && !EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
    return "";
  }

  // ── Submit an answer ──────────────────────────────────────────────────────
  const submitAnswer = useCallback((value: string) => {
    const err = validate(value.trim());
    if (err) { setValidationErr(err); return; }
    setValidationErr("");
    setInput("");

    const trimmed = value.trim();
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    const next = { ...answers };

    switch (step) {
      case "name":
        next.full_name = trimmed;
        setAnswers(next);
        jordanSay([`Nice to meet you, ${trimmed.split(" ")[0]}. What's the best phone number to reach you?`], () => setStep("phone"));
        break;
      case "phone":
        next.phone = trimmed;
        setAnswers(next);
        jordanSay(["What's your email address?"], () => setStep("email"));
        break;
      case "email":
        next.email = trimmed;
        setAnswers(next);
        jordanSay(["What's the name of your business?"], () => setStep("business"));
        break;
      case "business":
        next.business_name = trimmed;
        setAnswers(next);
        jordanSay(["What's your business website?"], () => setStep("website"));
        break;
      case "website":
        next.website = trimmed;
        setAnswers(next);
        jordanSay(["What type of business do you run?"], () => setStep("type"));
        break;
      case "type":
        next.business_type = trimmed;
        setAnswers(next);
        jordanSay(["What are you hoping to improve right now?"], () => setStep("goal"));
        break;
      case "goal":
        next.goal = trimmed;
        setAnswers(next);
        saveLead(next);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answers, jordanSay]);

  // ── Save lead ─────────────────────────────────────────────────────────────
  async function saveLead(a: Answers) {
    setStep("saving");
    setTyping(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: a.full_name,
          phone: a.phone,
          email: a.email,
          business_name: a.business_name,
          website: a.website.startsWith("http") ? a.website : `https://${a.website}`,
          source: "Website Chat",
          business_type: a.business_type,
          goal: a.goal,
        }),
      });
      setTyping(false);
      if (res.ok) {
        setStep("done");
        jordanSay([
          "Perfect — I've got your information.",
          "The next step is to book a quick strategy call so we can talk about your business and build your customer acquisition plan.",
        ]);
      } else {
        setStep("error");
        jordanSay(["Sorry, something went wrong saving your information. You can also reach us directly at the form below."]);
      }
    } catch {
      setTyping(false);
      setStep("error");
      jordanSay(["Sorry, something went wrong. Please try the form below."]);
    }
  }

  // ── Handle Enter key ──────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer(input);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    try { sessionStorage.removeItem(SK); } catch { /* noop */ }
    setMessages([]); setStep("intro"); setAnswers(EMPTY); setInput(""); setValidationErr(""); setTyping(false);
    setTimeout(() => startIntro(), 100);
  }

  // ── Toggle open ───────────────────────────────────────────────────────────
  function toggleOpen() {
    setOpen((v) => !v);
    if (!open) setUnread(false);
  }

  const isText = ["name", "phone", "email", "business", "website"].includes(step);
  const isQuick = step === "type" || step === "goal";
  const inputActive = isText || (isQuick); // show input for custom answer always

  return (
    <>
      {/* ── Keyframes (injected once) ─────────────────────────────────── */}
      <style>{`
        @keyframes chatDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Floating button ──────────────────────────────────────────────── */}
      <button
        onClick={toggleOpen}
        aria-label={open ? "Close chat" : "Chat with Jordan"}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#2563EB] text-white font-bold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-[#1d4ed8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      >
        <IconMessage />
        <span className="hidden sm:inline">Chat with Jordan</span>
        {unread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>

      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Jordan"
          className={[
            "fixed z-50 bg-white border border-gray-200 flex flex-col",
            "shadow-2xl",
            // Desktop: bottom-right panel, above launcher
            "sm:bottom-[72px] sm:right-5 sm:left-auto sm:w-[380px] sm:max-h-[75vh] sm:rounded-2xl",
            // Mobile: bottom sheet (full width)
            "bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl",
          ].join(" ")}
          style={{ animation: "chatSlideUp 0.25s ease forwards" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={JORDAN_PHOTO}
                alt="Jordan Nassie"
                className="w-10 h-10 rounded-full object-cover object-center border border-gray-100"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#0F172A] text-sm leading-tight">Jordan Nassie</p>
              <p className="text-xs text-[#64748B]">Customers.Direct &nbsp;·&nbsp; Here to help</p>
            </div>
            <button
              onClick={toggleOpen}
              aria-label="Close chat"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#64748B] transition-colors"
            >
              <IconX />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: "chatSlideUp 0.2s ease forwards" }}
              >
                <div
                  className={[
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    m.role === "jordan"
                      ? "bg-[#F1F5F9] text-[#0F172A] rounded-tl-sm"
                      : "bg-[#2563EB] text-white rounded-tr-sm",
                  ].join(" ")}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <TypingDots />
              </div>
            )}

            {/* Done — Book CTA */}
            {step === "done" && !typing && (
              <div className="flex justify-center mt-2" style={{ animation: "chatSlideUp 0.3s ease forwards" }}>
                <a
                  href="#strategy-call"
                  onClick={() => setOpen(false)}
                  className="w-full bg-[#2563EB] text-white font-bold text-sm text-center py-3.5 px-6 rounded-full hover:bg-[#1d4ed8] transition-colors shadow-md"
                >
                  Book a Strategy Call
                </a>
              </div>
            )}

            {/* Error — restart link */}
            {step === "error" && !typing && (
              <button onClick={reset} className="text-xs text-[#2563EB] underline mt-1 self-center">
                Start over
              </button>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {(step === "type" || step === "goal") && !typing && (
            <div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 shrink-0 border-t border-gray-50">
              {(step === "type" ? BUSINESS_TYPES : GOALS).map((opt) => (
                <button
                  key={opt}
                  onClick={() => submitAnswer(opt)}
                  className="text-xs font-medium bg-[#F1F5F9] hover:bg-[#DBEAFE] border border-gray-200 hover:border-[#BFDBFE] text-[#0F172A] px-3 py-1.5 rounded-full transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          {inputActive && !typing && step !== "done" && step !== "saving" && step !== "error" && (
            <div className="px-4 pb-4 pt-2 shrink-0 border-t border-gray-100">
              {validationErr && (
                <p className="text-xs text-red-500 mb-1.5">{validationErr}</p>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type={step === "email" ? "email" : step === "phone" ? "tel" : step === "website" ? "url" : "text"}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setValidationErr(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    step === "name" ? "Your full name" :
                    step === "phone" ? "(555) 000-0000" :
                    step === "email" ? "you@example.com" :
                    step === "business" ? "Business name" :
                    step === "website" ? "yourwebsite.com" :
                    "Type your answer…"
                  }
                  className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                />
                <button
                  onClick={() => submitAnswer(input)}
                  aria-label="Send"
                  className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center text-white hover:bg-[#1d4ed8] transition-colors shrink-0"
                >
                  <IconSend />
                </button>
              </div>
            </div>
          )}

          {/* Saving state */}
          {step === "saving" && (
            <div className="px-4 pb-4 pt-2 shrink-0 text-center text-xs text-[#94A3B8]">
              Saving your information…
            </div>
          )}
        </div>
      )}
    </>
  );
}
