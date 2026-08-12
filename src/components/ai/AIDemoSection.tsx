"use client";

import { useState, FormEvent } from "react";
import { PhoneCall, Check } from "lucide-react";

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  business_name: string;
  website: string;
  _honey: string;
}

const INITIAL: FormData = {
  full_name: "",
  phone: "",
  email: "",
  business_name: "",
  website: "",
  _honey: "",
};

const STEPS = [
  { num: "1", label: "Tell us about your business" },
  { num: "2", label: "See how your receptionist could work" },
  { num: "3", label: "Book a strategy call" },
];

export default function AIDemoSection() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.business_name.trim() ||
      !form.website.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "ai_receptionist_demo",
          goal: "AI Receptionist Demo",
        }),
      });

      if (res.ok) {
        window.location.href = "https://calendar.app.google/muM2Kqc8oYnWBPXXA";
      } else {
        setError("We couldn't save your information. Please try again.");
      }
    } catch {
      setError("We couldn't save your information. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fields: {
    name: keyof FormData;
    label: string;
    type: string;
    placeholder: string;
  }[] = [
    { name: "full_name", label: "Full Name", type: "text", placeholder: "Jane Smith" },
    { name: "phone", label: "Phone Number", type: "tel", placeholder: "(555) 000-0000" },
    { name: "email", label: "Email Address", type: "email", placeholder: "jane@example.com" },
    { name: "business_name", label: "Business Name", type: "text", placeholder: "Smith Dental" },
    { name: "website", label: "Website", type: "url", placeholder: "yourwebsite.com" },
  ];

  return (
    <section id="demo" className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* LEFT — Copy */}
        <div>
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            Hear It for Yourself
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight mb-5">
            Hear what an AI Receptionist could sound like for your business.
          </h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-10 max-w-md">
            Tell us about your business. We&apos;ll use your information to prepare the next step
            and show you how an AI receptionist could handle your calls.
          </p>

          <div className="flex flex-col gap-4">
            {STEPS.map(({ num, label }) => (
              <div
                key={num}
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-black text-sm shrink-0">
                  {num}
                </div>
                <span className="text-sm font-semibold text-[#0F172A]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
              <PhoneCall size={18} className="text-[#2563EB]" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-[#0F172A] text-sm">AI Receptionist Demo</p>
              <p className="text-xs text-[#64748B]">Customers.Direct</p>
            </div>
          </div>

          <h3 className="text-xl font-black text-[#0F172A] mb-1">
            Build My AI Demo
          </h3>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            Tell us about your business and we&apos;ll prepare your personalized demo.
          </p>
          <hr className="border-gray-100 mb-6" />

          <form onSubmit={handleSubmit} noValidate>
            {/* Honeypot */}
            <input
              type="text"
              name="_honey"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              value={form._honey}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-4">
              {fields.map(({ name, label, type, placeholder }) => (
                <div key={name}>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    {label} <span className="text-[#FF6B6B]" aria-label="required">*</span>
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  Build My AI Demo
                  <Check size={16} aria-hidden="true" />
                </>
              )}
            </button>

            <p className="text-xs text-[#94a3b8] text-center mt-4 leading-relaxed">
              Free strategy call · No obligation
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
