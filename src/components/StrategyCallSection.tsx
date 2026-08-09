"use client";

import { useState, FormEvent } from "react";

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

export default function StrategyCallSection() {
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

    // Client-side validation
    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim() || !form.business_name.trim() || !form.website.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  return (
    <section id="strategy-call" className="gradient-bg py-20 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left — Timeline */}
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] mb-10">
            Your next step
          </h2>

          <div className="flex flex-col gap-0">
            {[
              {
                num: "1",
                title: "Tell us about your business",
                body: "Share a few details so we can learn about your goals.",
              },
              {
                num: "2",
                title: "Choose an available time",
                body: "Pick a time that works for you from our calendar.",
              },
              {
                num: "3",
                title: "We build your customer plan",
                body: "We'll create a custom plan to bring new customers to your DMs.",
              },
            ].map((step, i, arr) => (
              <div key={step.num} className="flex gap-4">
                {/* Line + dot */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-black text-sm shrink-0">
                    {step.num}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-0.5 h-full bg-[#DBEAFE] my-1 min-h-[32px]" />
                  )}
                </div>
                {/* Text */}
                <div className="pb-8">
                  <h3 className="font-bold text-[#0F172A] text-base mb-1">{step.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Card Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Jordan%20Profile.PNG"
                alt="Jordan Nassie, Customers.Direct"
                className="w-32 h-32 rounded-full object-cover object-center border-2 border-white"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              {/* Fallback initials — hidden unless image fails */}
              <div
                className="w-32 h-32 rounded-full bg-[#2563EB] items-center justify-center text-white font-black text-base absolute inset-0"
                style={{ display: "none" }}
              >
                JN
              </div>
            </div>
            <div>
              <div className="font-bold text-[#0F172A] text-sm">Jordan Nassie</div>
              <div className="text-xs text-[#64748B]">Customers.Direct</div>
            </div>
          </div>
          <h3 className="text-xl font-black text-[#0F172A] mb-1">
            Customers.Direct — Strategy Call
          </h3>
          <p className="text-sm text-[#64748B] mb-6">
            30-minute strategy call · Free · No obligation
          </p>
          <hr className="border-gray-100 mb-6" />

          {/* Form Intro */}
          <p className="font-bold text-[#0F172A] mb-1">First, where can we reach you?</p>
          <p className="text-sm text-[#64748B] mb-6">
            Enter your details to view available strategy-call times.
          </p>

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
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Full Name <span className="text-[#FF6B6B]">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Phone Number <span className="text-[#FF6B6B]">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                  placeholder="(555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Email Address <span className="text-[#FF6B6B]">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Business Name <span className="text-[#FF6B6B]">*</span>
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={form.business_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                  placeholder="Smith Law Firm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Website <span className="text-[#FF6B6B]">*</span>
                </label>
                <input
                  type="url"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                  placeholder="yourwebsite.com"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-[#2563EB] text-white font-bold py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                "Continue to Available Times →"
              )}
            </button>

            {/* Consent */}
            <p className="text-xs text-[#94a3b8] text-center mt-4 leading-relaxed">
              By continuing, you agree to receive a call, email, or text regarding your Customers.Direct inquiry.
            </p>
            <p className="text-xs text-[#94a3b8] text-center mt-1 font-medium">
              Free · 30 minutes · No obligation
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
