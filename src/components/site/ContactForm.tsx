"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterestValue = "ai_visibility" | "chatgpt_ads" | "agency" | "other";

const INTERESTS: { value: InterestValue; label: string }[] = [
  { value: "ai_visibility", label: "AI Visibility" },
  { value: "chatgpt_ads",   label: "ChatGPT Ads" },
  { value: "agency",        label: "Join as Agency" },
  { value: "other",         label: "Other" },
];

const MESSAGE_PLACEHOLDERS: Record<InterestValue, string> = {
  ai_visibility: "Tell us about your business and what you'd like to track.",
  chatgpt_ads:   "Tell us what you sell, where your customers are located, and your approximate monthly advertising budget.",
  agency:        "Tell us about your agency, how many client brands you manage, and how we can help.",
  other:         "How can we help?",
};

export type ContactSource = "contact_page" | "ads_page" | "chat" | "agency" | "other";

function interestFromParam(param: string | null): InterestValue {
  if (param === "ai_visibility" || param === "chatgpt_ads" || param === "agency" || param === "other") return param;
  // Legacy topic → interest mapping for backward compat
  if (param === "sales" || param === "enterprise") return "ai_visibility";
  return "other";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputClass =
  "w-full border border-[#E5E5E1] rounded-xl px-4 py-3 text-[13.5px] text-[#171717] bg-white placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#0866F5]/20 focus:border-[#0866F5] transition-colors";
const labelClass = "block text-[12.5px] font-semibold text-[#171717] mb-1.5";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactFormProps {
  /** Pre-selected interest — overrides URL param */
  initialInterest?: InterestValue;
  /** Source identifier passed to the API */
  source?: ContactSource;
  /** Compact mode for embedding (e.g., inside chat widget) */
  compact?: boolean;
  /** Callback fired after successful submission */
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactForm({
  initialInterest,
  source = "contact_page",
  compact = false,
  onSuccess,
}: ContactFormProps) {
  const searchParams = useSearchParams();
  const pathname     = usePathname();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [company,  setCompany]  = useState("");
  const [website,  setWebsite]  = useState("");
  const [phone,    setPhone]    = useState("");
  const [interest, setInterest] = useState<InterestValue>(
    initialInterest ?? interestFromParam(searchParams?.get("interest") ?? searchParams?.get("topic"))
  );
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Sync interest from URL params (e.g., when navigating to /contact?interest=chatgpt_ads)
  useEffect(() => {
    if (initialInterest) return; // prop takes precedence
    const param = searchParams?.get("interest") ?? searchParams?.get("topic");
    setInterest(interestFromParam(param));
  }, [searchParams, initialInterest]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // prevent duplicate clicks
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          phone,
          interest,
          message,
          source,
          page_path: pathname ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div
        className={`bg-white border border-[#E5E5E1] rounded-2xl flex flex-col items-center text-center gap-4 ${
          compact ? "p-6" : "p-10"
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center">
          <CheckCircle2 size={22} className="text-[#15803D]" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-[#171717] mb-1">
            Thanks! We&apos;ve received your message.
          </h2>
          <p className="text-[13.5px] text-[#777773]">
            We&apos;ll be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const messagePlaceholder = MESSAGE_PLACEHOLDERS[interest];

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white border border-[#E5E5E1] rounded-2xl flex flex-col gap-5 ${
        compact ? "p-4 sm:p-5" : "p-6 sm:p-8"
      }`}
      noValidate
    >
      {/* Honeypot */}
      <input type="text" name="_honey" className="hidden" aria-hidden="true" tabIndex={-1} />

      {/* Name + Email — single column in compact/chat mode */}
      <div className={compact ? "flex flex-col gap-5" : "grid sm:grid-cols-2 gap-5"}>
        <div>
          <label htmlFor="cf-name" className={labelClass}>
            Full Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="cf-name"
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="cf-email" className={labelClass}>
            Email <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="cf-email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className={inputClass}
            autoComplete="email"
          />
        </div>
      </div>

      {/* Company + Website — single column in compact/chat mode */}
      <div className={compact ? "flex flex-col gap-5" : "grid sm:grid-cols-2 gap-5"}>
        <div>
          <label htmlFor="cf-company" className={labelClass}>
            {interest === "agency" ? "Agency name" : "Company / Business"}
          </label>
          <input
            id="cf-company"
            type="text"
            maxLength={200}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={interest === "agency" ? "Your agency name" : "Your business name"}
            className={inputClass}
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor="cf-website" className={labelClass}>Website</label>
          <input
            id="cf-website"
            type="text"
            maxLength={500}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={interest === "agency" ? "youragency.com" : "yourbusiness.com"}
            className={inputClass}
            autoComplete="url"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="cf-phone" className={labelClass}>Phone</label>
        <input
          id="cf-phone"
          type="tel"
          maxLength={30}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(optional)"
          className={inputClass}
          autoComplete="tel"
        />
      </div>

      {/* Interested in */}
      <div>
        <label htmlFor="cf-interest" className={labelClass}>
          Interested in <span className="text-[#DC2626]">*</span>
        </label>
        <select
          id="cf-interest"
          required
          value={interest}
          onChange={(e) => setInterest(e.target.value as InterestValue)}
          className={inputClass}
        >
          {INTERESTS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="cf-message" className={labelClass}>
          Message <span className="text-[#DC2626]">*</span>
        </label>
        <textarea
          id="cf-message"
          required
          maxLength={5000}
          rows={compact ? 4 : 6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={messagePlaceholder}
          className={`${inputClass} resize-none`}
        />
        <p className="text-[11px] text-[#A3A3A0] mt-1 text-right">{message.length}/5000</p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="text-[12.5px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#0866F5] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#0755D4] transition-colors text-[14px] disabled:opacity-60 active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            Send Message
            <ArrowRight size={14} />
          </>
        )}
      </button>

      {/* Privacy note */}
      <p className="text-[11px] text-[#A3A3A0] text-center">
        We&apos;ll use your details to respond to your inquiry.{" "}
        <Link href="/privacy" className="underline hover:text-[#777773] transition-colors">
          Privacy Policy
        </Link>
      </p>
    </form>
  );
}
