"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import ContactForm, { type InterestValue } from "@/components/site/ContactForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "opening" | "form" | "done";

function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconMegaphone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M9 11h1"/><path d="M14 7h1"/><path d="M14 11h1"/>
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

const CHAT_CHOICES: { value: InterestValue; label: string; icon: React.ReactNode }[] = [
  { value: "ai_visibility", label: "AI Visibility",   icon: <IconBarChart /> },
  { value: "chatgpt_ads",   label: "ChatGPT Ads",     icon: <IconMegaphone /> },
  { value: "agency",        label: "Join as Agency",  icon: <IconBuilding /> },
  { value: "other",         label: "Other",            icon: <IconChat /> },
];

const JORDAN_PHOTO =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Jordan%20Profile.PNG";

// Session key — bump version to reset saved sessions when logic changes
const SK = "cd_chat_v4";

interface SavedState { interest: InterestValue; stage: Stage; }

function loadSession(): SavedState | null {
  try { return JSON.parse(sessionStorage.getItem(SK) ?? "null"); }
  catch { return null; }
}
function saveSession(state: SavedState) {
  try { sessionStorage.setItem(SK, JSON.stringify(state)); } catch { /* noop */ }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [stage,    setStage]    = useState<Stage>("opening");
  const [interest, setInterest] = useState<InterestValue>("other");
  const [unread,   setUnread]   = useState(false);
  const [showMsg,  setShowMsg]  = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // ── Restore session ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setInterest(saved.interest);
      setStage(saved.stage);
    }
  }, []);

  // ── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    saveSession({ interest, stage });
  }, [interest, stage]);

  // ── Show greeting bubble after 4 s on first load ──────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (!open) { setUnread(true); setShowMsg(true); }
    }, 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open / close ──────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    setOpen((v) => !v);
    setUnread(false);
    setShowMsg(false);
  }, []);

  // ── Select a topic ────────────────────────────────────────────────────────
  const handleChoice = useCallback((value: InterestValue) => {
    setInterest(value);
    setStage("form");
  }, []);

  // ── Form success ──────────────────────────────────────────────────────────
  const handleFormSuccess = useCallback(() => {
    setStage("done");
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStage("opening");
    setInterest("other");
    try { sessionStorage.removeItem(SK); } catch { /* noop */ }
  }, []);

  return (
    <>
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatBubblePop {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Greeting bubble ──────────────────────────────────────────────── */}
      {showMsg && !open && (
        <div
          className="fixed bottom-[90px] right-6 z-50 bg-white border border-[#E5E5E1] rounded-2xl rounded-br-sm px-4 py-3 shadow-lg text-[13px] text-[#171717] max-w-[220px] cursor-pointer"
          style={{ animation: "chatBubblePop 0.25s ease forwards" }}
          onClick={handleToggle}
          role="button"
          aria-label="Open chat"
        >
          Hi! What can we help you with?
          <div className="absolute -bottom-2 right-3 w-3 h-3 bg-white border-r border-b border-[#E5E5E1] rotate-45" />
        </div>
      )}

      {/* ── Launcher ─────────────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Close chat" : "Chat with us"}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 rounded-full group"
      >
        <div
          className="relative w-14 h-14 rounded-full bg-[#171717] flex items-center justify-center text-white ring-2 ring-white transition-all duration-200 group-hover:scale-[1.05] group-hover:bg-[#2A2A2A] group-hover:shadow-2xl"
          style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.22)" }}
        >
          {open ? (
            <IconX />
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
          {unread && (
            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[#0866F5] border-2 border-white text-[8px] text-white font-black flex items-center justify-center">!</span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-[#171717] leading-none select-none tracking-tight">Chat</span>
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat with Customers.Direct"
          className={[
            "fixed z-50 bg-white border border-gray-200 flex flex-col shadow-2xl overflow-hidden",
            "sm:bottom-[88px] sm:right-6 sm:left-auto sm:w-[380px] sm:max-h-[80vh] sm:rounded-2xl",
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
              <img
                src={JORDAN_PHOTO}
                alt="Jordan at Customers.Direct"
                className="w-10 h-10 rounded-full object-cover object-center border border-gray-100"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#171717] text-sm leading-tight">Customers.Direct</p>
              <p className="text-xs text-[#777773]">We typically respond within 24 hours</p>
            </div>
            {stage !== "opening" && (
              <button
                onClick={reset}
                aria-label="Start over"
                title="Start over"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#64748B] transition-colors"
              >
                <IconRefresh />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#64748B] transition-colors"
            >
              <IconX />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* ── Opening: topic selection ────────────────────────────────── */}
            {stage === "opening" && (
              <div className="px-4 py-6 flex flex-col gap-4">
                {/* Jordan greeting */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F0F0EC] flex items-center justify-center shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={JORDAN_PHOTO} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-[#F0F0EC] text-[#171717] text-[13.5px] px-4 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed max-w-[85%]"
                    style={{ animation: "chatSlideUp 0.2s ease forwards" }}>
                    Hi! What can we help you with?
                  </div>
                </div>

                {/* Choices */}
                <div className="flex flex-col gap-2.5 mt-2" style={{ animation: "chatSlideUp 0.3s ease forwards" }}>
                  {CHAT_CHOICES.map((choice) => (
                    <button
                      key={choice.value}
                      onClick={() => handleChoice(choice.value)}
                      className="flex items-center gap-3 w-full text-left bg-white border border-[#E5E5E1] hover:border-[#0866F5]/40 hover:bg-[#EFF6FF]/30 text-[#171717] px-4 py-3 rounded-xl transition-colors text-[13.5px] font-medium active:scale-[0.98]"
                    >
                      <span className="text-[#6B7280] shrink-0">{choice.icon}</span>
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Form stage ──────────────────────────────────────────────── */}
            {stage === "form" && (
              <div className="px-4 py-4" style={{ animation: "chatSlideUp 0.2s ease forwards" }}>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={reset}
                    className="text-[11px] text-[#A3A3A0] hover:text-[#777773] transition-colors"
                    aria-label="Go back"
                  >
                    ← Back
                  </button>
                  <span className="text-[11px] text-[#A3A3A0]">·</span>
                  <span className="text-[11px] text-[#171717] font-medium">
                    {CHAT_CHOICES.find((c) => c.value === interest)?.label}
                  </span>
                </div>
                <Suspense fallback={<div className="h-64 animate-pulse bg-[#F5F5F2] rounded-xl" />}>
                  <ContactForm
                    initialInterest={interest}
                    source="chat"
                    compact
                    onSuccess={handleFormSuccess}
                  />
                </Suspense>
              </div>
            )}

            {/* ── Done ────────────────────────────────────────────────────── */}
            {stage === "done" && (
              <div className="px-4 py-10 flex flex-col items-center text-center gap-4" style={{ animation: "chatSlideUp 0.2s ease forwards" }}>
                <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[#171717] text-[15px] mb-1">Thanks! Message received.</p>
                  <p className="text-[13px] text-[#777773]">We&apos;ll be in touch within 24 hours.</p>
                </div>
                <button
                  onClick={reset}
                  className="text-[12px] text-[#A3A3A0] hover:text-[#777773] underline mt-2 transition-colors"
                >
                  Send another message
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
