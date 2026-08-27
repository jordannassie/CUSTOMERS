"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Lightbulb, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  businessId?: string;
}

export default function SuggestFeatureModal({ businessId }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [state, setState]     = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Capture current page route on open
  const [pageContext, setPageContext] = useState<string>("");
  function openModal() {
    setPageContext(typeof window !== "undefined" ? window.location.pathname : "");
    setState("idle");
    setErrorMsg(null);
    setOpen(true);
  }

  // Focus title field when modal opens
  useEffect(() => {
    if (open && state === "idle") {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, state]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;

    const form = e.currentTarget;
    const title       = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim();

    if (!title) { setErrorMsg("Please add a short title."); return; }
    if (!description) { setErrorMsg("Please describe the feature."); return; }

    setState("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/geo/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, businessId, pageContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("error");
      } else {
        setState("success");
        // Auto-close and go back to dashboard after 2 seconds
        setTimeout(() => {
          setOpen(false);
          router.push("/dashboard");
        }, 2000);
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[12px] font-medium text-[#A3A3A0] hover:bg-[#F5F5F2] hover:text-[#777773] transition-colors"
      >
        <Lightbulb size={13} aria-hidden="true" className="shrink-0" />
        Suggest a Feature
      </button>

      {/* Modal overlay — rendered in a portal so chart canvases can't bleed through */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="suggest-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <Lightbulb size={15} className="text-[#2563EB]" />
                </div>
                <h2 id="suggest-modal-title" className="text-[16px] font-bold text-[#171717]">
                  Suggest a Feature
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#A3A3A0] hover:text-[#555552] transition-colors p-1 rounded-lg hover:bg-[#F5F5F2]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pt-4 pb-6">
              {state === "success" ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-[#16A34A]" />
                  </div>
                  <p className="text-[16px] font-bold text-[#171717]">Thank you!</p>
                  <p className="text-[13px] text-[#777773]">We received your suggestion and read every idea from our beta users.</p>
                  <p className="text-[11.5px] text-[#A3A3A0]">Taking you back to the dashboard…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <p className="text-[12.5px] text-[#777773] mb-5">
                    What would make Customers.Direct more useful for your business?
                  </p>

                  {/* Title field */}
                  <div className="mb-4">
                    <label htmlFor="suggest-title" className="block text-[12px] font-semibold text-[#555552] mb-1.5">
                      Feature / Idea
                    </label>
                    <input
                      ref={titleRef}
                      id="suggest-title"
                      name="title"
                      type="text"
                      maxLength={200}
                      placeholder="e.g. Export competitor data as CSV"
                      className="w-full px-3 py-2.5 text-[13px] border border-[#E5E5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-shadow placeholder:text-[#D4D4CF] text-[#171717]"
                      disabled={state === "submitting"}
                    />
                  </div>

                  {/* Description field */}
                  <div className="mb-5">
                    <label htmlFor="suggest-desc" className="block text-[12px] font-semibold text-[#555552] mb-1.5">
                      Tell us what you&apos;d like Customers.Direct to do
                    </label>
                    <textarea
                      id="suggest-desc"
                      name="description"
                      rows={4}
                      maxLength={2000}
                      placeholder="Describe the feature and how it would help you…"
                      className="w-full px-3 py-2.5 text-[13px] border border-[#E5E5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-shadow resize-none placeholder:text-[#D4D4CF] text-[#171717]"
                      disabled={state === "submitting"}
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-[12px] text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={state === "submitting"}
                      className="flex items-center gap-2 bg-[#171717] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {state === "submitting" ? (
                        <><Loader2 size={13} className="animate-spin" /> Sending…</>
                      ) : (
                        "Send Suggestion"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={state === "submitting"}
                      className="px-4 py-2.5 text-[13px] font-medium text-[#777773] hover:text-[#171717] transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
