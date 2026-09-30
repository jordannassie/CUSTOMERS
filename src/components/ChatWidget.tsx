"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import { BarChart3, Building2, Calendar, Check, ChevronLeft, MessageCircle, MessageSquare, RotateCcw, X } from "lucide-react";
import ContactForm, { type InterestValue } from "@/components/site/ContactForm";

type Stage = "opening" | "form" | "done";

const CHAT_CHOICES: { value: InterestValue; label: string; icon: React.ReactNode }[] = [
  { value: "ai_visibility", label: "AI Visibility",  icon: <BarChart3 className="size-[18px]" aria-hidden="true" /> },
  { value: "agency",        label: "Join as Agency", icon: <Building2 className="size-[18px]" aria-hidden="true" /> },
  { value: "book_demo",     label: "Book Demo Call", icon: <Calendar className="size-[18px]" aria-hidden="true" /> },
  { value: "other",         label: "Other",          icon: <MessageSquare className="size-[18px]" aria-hidden="true" /> },
];

const JORDAN_PHOTO = "/images/people/jordan.jpg";

// Below this width the page content reaches the launcher's corner (UI-002).
const WIDE_QUERY = "(min-width: 1400px)";

// Session key: bump version to reset saved sessions when logic changes
const SK = "cd_chat_v4";

interface SavedState { interest: InterestValue; stage: Stage; }

function loadSession(): SavedState | null {
  try { return JSON.parse(sessionStorage.getItem(SK) ?? "null"); }
  catch { return null; }
}
function saveSession(state: SavedState) {
  try { sessionStorage.setItem(SK, JSON.stringify(state)); } catch { /* noop */ }
}

const iconButton =
  "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const textButton =
  "rounded-sm text-[13px] text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const enter = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-200 ease-out";

export default function ChatWidget() {
  const [open,     setOpen]     = useState(false);
  // Safe to read storage on first render: stage and interest only show once the panel is opened.
  const [stage,    setStage]    = useState<Stage>(() => loadSession()?.stage ?? "opening");
  const [interest, setInterest] = useState<InterestValue>(() => loadSession()?.interest ?? "other");
  const [unread,   setUnread]   = useState(false);
  const [showMsg,  setShowMsg]  = useState(false);
  const [inView,   setInView]   = useState(false);

  useEffect(() => {
    saveSession({ interest, stage });
  }, [interest, stage]);

  // Show greeting bubble after 4 s on first load
  useEffect(() => {
    const t = setTimeout(() => {
      if (!open) { setUnread(true); setShowMsg(true); }
    }, 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On narrower screens the launcher waits until the first screen has scrolled away, so it never sits on the hero.
  useEffect(() => {
    const wide = window.matchMedia(WIDE_QUERY);
    const update = () => setInView(wide.matches || window.scrollY > window.innerHeight);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((v) => !v);
    setUnread(false);
    setShowMsg(false);
  }, []);

  const handleChoice = useCallback((value: InterestValue) => {
    setInterest(value);
    setStage("form");
  }, []);

  const handleFormSuccess = useCallback(() => {
    setStage("done");
  }, []);

  const reset = useCallback(() => {
    setStage("opening");
    setInterest("other");
    try { sessionStorage.removeItem(SK); } catch { /* noop */ }
  }, []);

  const showLauncher = open || inView;

  return (
    <>
      {/* Keeps the end of the page clear of the launcher where it overlaps content. */}
      <div aria-hidden="true" className="h-20 bg-surface min-[1400px]:hidden" />

      {/* Only on wide screens, where it sits in the empty margin beside the content. */}
      {showMsg && !open && showLauncher && (
        <div
          className={`fixed bottom-20 right-6 z-50 hidden max-w-[160px] cursor-pointer rounded-md border border-border bg-surface px-4 py-3 text-[13px] text-foreground shadow-float min-[1400px]:block ${enter}`}
          onClick={handleToggle}
          role="button"
          aria-label="Open chat"
        >
          Hi! What can we help you with?
          <div className="absolute -bottom-[5px] right-6 size-2.5 rotate-45 border-r border-b border-border bg-surface" />
        </div>
      )}

      {showLauncher && (
        <button
          onClick={handleToggle}
          aria-label={open ? "Close chat" : "Chat with us"}
          className={`fixed right-4 bottom-4 z-50 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-float transition-colors duration-150 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 sm:right-6 sm:bottom-6 ${enter}`}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
          Chat
          {unread && <span className="size-2 rounded-full bg-primary-foreground" aria-hidden="true" />}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chat with Customers.Direct"
          className={[
            "fixed z-50 flex flex-col overflow-hidden border border-border bg-surface shadow-float",
            "inset-x-0 bottom-0 max-h-[min(90dvh,90vh)] rounded-t-md",
            "sm:bottom-20 sm:right-6 sm:left-auto sm:w-[380px] sm:max-h-[80vh] sm:rounded-md",
            enter,
          ].join(" ")}
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
            <Image
              src={JORDAN_PHOTO}
              alt="Jordan at Customers.Direct"
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full border border-border bg-muted object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold text-foreground">Customers.Direct</p>
              <p className="text-xs text-muted-foreground">We typically respond within 24 hours</p>
            </div>
            {stage !== "opening" && (
              <button onClick={reset} aria-label="Start over" title="Start over" className={iconButton}>
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close chat" className={iconButton}>
              <X className="size-[18px]" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {stage === "opening" && (
              <div className="flex flex-col gap-4 px-4 py-6">
                <div className="flex items-start gap-3">
                  <Image
                    src={JORDAN_PHOTO}
                    alt=""
                    aria-hidden="true"
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full bg-muted object-cover"
                  />
                  <div className="max-w-[85%] rounded-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
                    Hi! What can we help you with?
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  {CHAT_CHOICES.map((choice) => (
                    <button
                      key={choice.value}
                      onClick={() => handleChoice(choice.value)}
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:border-primary/40 hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="shrink-0 text-muted-foreground">{choice.icon}</span>
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stage === "form" && (
              <div className="px-4 py-4">
                <div className="mb-4 flex items-center gap-3">
                  <button onClick={reset} className={`inline-flex items-center gap-1 ${textButton}`} aria-label="Go back">
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Back
                  </button>
                  <span className="h-3.5 w-px bg-border" aria-hidden="true" />
                  <span className="text-[13px] font-medium text-foreground">
                    {CHAT_CHOICES.find((c) => c.value === interest)?.label}
                  </span>
                </div>
                <Suspense fallback={<div className="h-64 rounded-md bg-muted motion-safe:animate-pulse" />}>
                  <ContactForm
                    initialInterest={interest}
                    source="chat"
                    compact
                    onSuccess={handleFormSuccess}
                  />
                </Suspense>
              </div>
            )}

            {stage === "done" && (
              <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-md bg-good-bg text-good-text">
                  <Check className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="mb-1 text-[15px] font-semibold text-foreground">Thanks! Message received.</p>
                  <p className="text-[13px] text-muted-foreground">We&apos;ll be in touch within 24 hours.</p>
                </div>
                <button onClick={reset} className={`mt-2 underline ${textButton}`}>
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
