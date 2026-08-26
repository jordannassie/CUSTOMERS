"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const TOPICS = [
  { value: "product",    label: "Product Question" },
  { value: "support",    label: "Account / Support" },
  { value: "sales",      label: "Sales" },
  { value: "enterprise", label: "Enterprise" },
  { value: "agency",     label: "Multiple Businesses / Agency" },
  { value: "other",      label: "Other" },
] as const;

type TopicValue = (typeof TOPICS)[number]["value"];

function topicFromParam(param: string | null): TopicValue {
  const valid = TOPICS.map((t) => t.value);
  if (param && valid.includes(param as TopicValue)) return param as TopicValue;
  return "other";
}

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [topic,   setTopic]   = useState<TopicValue>("other");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Preselect topic from URL query param (?topic=sales, ?topic=support, etc.)
  useEffect(() => {
    setTopic(topicFromParam(searchParams.get("topic")));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, website, topic, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white border border-[#E5E5E1] rounded-2xl p-10 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center">
          <CheckCircle2 size={22} className="text-[#15803D]" />
        </div>
        <h2 className="text-[20px] font-bold text-[#171717]">Message received</h2>
        <p className="text-[14px] text-[#777773] max-w-sm">
          Thanks — we received your message and will follow up soon.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full border border-[#E5E5E1] rounded-xl px-4 py-3 text-[13.5px] text-[#171717] bg-white placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#0866F5]/20 focus:border-[#0866F5] transition-colors";
  const labelClass = "block text-[12.5px] font-semibold text-[#171717] mb-1.5";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#E5E5E1] rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
    >
      {/* Honeypot */}
      <input type="text" name="_honey" className="hidden" aria-hidden="true" tabIndex={-1} />

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contact-company" className={labelClass}>Company / Business</label>
          <input
            id="contact-company"
            type="text"
            maxLength={200}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your business name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-website" className={labelClass}>Website</label>
          <input
            id="contact-website"
            type="text"
            maxLength={500}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="yourbusiness.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-topic" className={labelClass}>
          Topic <span className="text-[#DC2626]">*</span>
        </label>
        <select
          id="contact-topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value as TopicValue)}
          className={inputClass}
        >
          {TOPICS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message <span className="text-[#DC2626]">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className={`${inputClass} resize-none`}
        />
        <p className="text-[11px] text-[#A3A3A0] mt-1 text-right">
          {message.length}/5000
        </p>
      </div>

      {error && (
        <div
          className="text-[12.5px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3"
          role="alert"
        >
          {error}
        </div>
      )}

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
    </form>
  );
}
