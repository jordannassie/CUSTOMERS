"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Code2, Copy, LockKeyhole, Phone, ShieldCheck } from "lucide-react";

const PRESET_COLORS = ["#2563EB", "#0F172A", "#16A34A", "#DC2626", "#7C3AED"];

function attributeValue(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default function CallBarGenerator() {
  const [businessPhone, setBusinessPhone] = useState("");
  const [barText, setBarText] = useState("Call Now");
  const [backgroundColor, setBackgroundColor] = useState("#2563EB");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const embedCode = useMemo(
    () =>
      `<script src="https://customers.direct/embed/call-bar.v1.js" data-phone="${attributeValue(
        businessPhone,
      )}" data-text="${attributeValue(barText || "Call Now")}" data-bg-color="${attributeValue(
        backgroundColor,
      )}" data-text-color="${attributeValue(textColor)}"${
        businessName
          ? ` data-business-name="${attributeValue(businessName)}"`
          : ""
      } defer></script>`,
    [backgroundColor, barText, businessName, businessPhone, textColor],
  );

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || unlocked) return;
    if (!businessPhone.trim()) {
      setError("Enter the business phone number used by the Call Bar.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          email,
          phone,
          business_name: businessName || "Call Bar Lead",
          website: document.referrer || window.location.href,
          source: "call_bar",
          business_type: businessPhone,
          goal: JSON.stringify({
            text: barText,
            backgroundColor,
            textColor,
          }),
          call_bar_business_phone: businessPhone,
          call_bar_text: barText,
          call_bar_bg_color: backgroundColor,
          call_bar_text_color: textColor,
          referrer_url: document.referrer || window.location.href,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "We could not save your Call Bar.");
      }
      setUnlocked(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not save your Call Bar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";

  return (
    <main className="overflow-hidden bg-white">
      <section className="relative px-4 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(37,99,235,0.13),transparent_35%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,0.08),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
            <Phone size={14} aria-hidden="true" />
            Free Lead Generation Tool
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-[#0F172A] sm:text-6xl">
            Never Lose a Mobile Visitor Who Wants to Call
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#64748B]">
            Add a simple one-tap Call Bar to the bottom of your mobile website so
            customers can reach your business instantly.
          </p>
        </div>
      </section>

      <section className="bg-[#F8FAFC] px-4 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">
                Customize
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
                Build your Call Bar
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                Business Phone Number <span className="text-red-500">*</span>
                <input
                  type="tel"
                  required
                  value={businessPhone}
                  onChange={(event) => setBusinessPhone(event.target.value)}
                  placeholder="(555) 555-5555"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Call Bar Text
                <input
                  value={barText}
                  onChange={(event) => setBarText(event.target.value.slice(0, 80))}
                  placeholder="Call Now"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Business Name <span className="font-medium text-slate-400">(optional)</span>
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value.slice(0, 200))}
                  placeholder="Your Business"
                  className={inputClass}
                />
              </label>

              <div className="sm:col-span-2">
                <p className="text-sm font-bold text-slate-700">Background Color</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBackgroundColor(color)}
                      aria-label={`Use ${color} background`}
                      className={`h-10 w-10 rounded-full border-4 transition ${
                        backgroundColor === color
                          ? "border-blue-200 ring-2 ring-[#2563EB]"
                          : "border-white ring-1 ring-slate-200"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    Custom
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm font-bold text-slate-700">Text Color</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["#FFFFFF", "Light"],
                    ["#0F172A", "Dark"],
                  ].map(([color, label]) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTextColor(color)}
                      className={`rounded-full border px-4 py-2 text-sm font-bold ${
                        textColor === color
                          ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    aria-label="Custom text color"
                    className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-28">
            <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Live Mobile Preview
            </p>
            <div className="mx-auto w-full max-w-[360px] rounded-[42px] border-[8px] border-slate-950 bg-slate-950 p-1 shadow-2xl">
              <div className="relative min-h-[620px] overflow-hidden rounded-[30px] bg-white">
                <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-950" />
                <div className="bg-gradient-to-br from-slate-950 to-slate-700 px-6 pb-12 pt-16 text-white">
                  <div className="h-3 w-28 rounded bg-white/30" />
                  <div className="mt-5 h-8 w-4/5 rounded bg-white/90" />
                  <div className="mt-3 h-3 w-full rounded bg-white/25" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-white/25" />
                </div>
                <div className="space-y-5 p-6">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-100 p-4">
                      <div className="h-4 w-2/3 rounded bg-slate-200" />
                      <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 flex min-h-16 items-center justify-center gap-3 px-5 py-4 text-center font-black shadow-[0_-8px_24px_rgba(15,23,42,0.18)]"
                  style={{ backgroundColor, color: textColor }}
                >
                  <Phone size={21} aria-hidden="true" />
                  <span>{barText || "Call Now"}</span>
                </div>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-6 text-slate-500">
              Visible on mobile only. Tapping it calls{" "}
              <strong className="text-slate-700">
                {businessPhone || "your business number"}
              </strong>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <Code2 className="mx-auto text-[#2563EB]" size={30} aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-black text-[#0F172A]">
              Add This To Your Website
            </h2>
            <p className="mt-3 text-slate-500">
              One lightweight code block. No plugins or technical setup required.
            </p>
          </div>

          {!unlocked ? (
            <form
              onSubmit={unlock}
              className="mt-9 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 sm:p-8"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5 text-[#2563EB]">
                  <LockKeyhole size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-black text-[#0F172A]">
                    Enter your information to unlock your free Call Bar code.
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your code unlocks only after your details are saved successfully.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-bold text-slate-700">
                  Name
                  <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Email
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Phone
                  <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
                </label>
              </div>
              <input name="_honey" tabIndex={-1} autoComplete="off" className="hidden" />
              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                <LockKeyhole size={18} aria-hidden="true" />
                {submitting ? "Saving Your Call Bar…" : "Unlock My Call Bar"}
              </button>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} aria-hidden="true" />
                Your details are securely saved with Customers Direct.
              </p>
            </form>
          ) : (
            <div className="mt-9 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-8">
              <div className="flex items-center gap-2 font-black text-emerald-700">
                <Check size={20} aria-hidden="true" />
                Your Call Bar is ready.
              </div>
              <pre className="mt-5 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[#0F172A] p-5 text-sm leading-6 text-blue-100">
                <code>{embedCode}</code>
              </pre>
              <button
                type="button"
                onClick={copyCode}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-6 py-3.5 font-black text-white hover:bg-slate-800 sm:w-auto"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy Code"}
              </button>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Paste this code before the closing <code>&lt;/body&gt;</code> tag on
                your website.
              </p>
              <details className="mt-5 rounded-xl border border-emerald-200 bg-white p-4">
                <summary className="cursor-pointer font-bold text-slate-700">
                  WordPress, Shopify, Squarespace, or Wix?
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Add the code through your platform&apos;s custom code, footer code,
                  or theme settings area. Place it before the closing body tag and
                  publish your changes.
                </p>
              </details>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
