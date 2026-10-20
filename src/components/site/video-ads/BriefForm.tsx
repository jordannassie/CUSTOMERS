"use client";

import { useState } from "react";
import Link from "next/link";

const FIELDS = [
  { name: "customerName", label: "Your name", autoComplete: "name" },
  { name: "email", label: "Email", autoComplete: "email", type: "email" },
  { name: "businessName", label: "Business name", autoComplete: "organization" },
  { name: "websiteUrl", label: "Website", autoComplete: "url" },
  { name: "product", label: "Product or service being advertised" },
  { name: "audience", label: "Target audience" },
] as const;

export function BriefForm({
  sessionId,
  token,
  packageName,
  priceLabel,
  defaultName,
  defaultEmail,
}: {
  sessionId: string;
  token: string;
  packageName: string;
  priceLabel: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      sessionId,
      token,
      customerName: String(form.get("customerName") ?? ""),
      email: String(form.get("email") ?? ""),
      businessName: String(form.get("businessName") ?? ""),
      websiteUrl: String(form.get("websiteUrl") ?? ""),
      product: String(form.get("product") ?? ""),
      audience: String(form.get("audience") ?? ""),
      creativeInstructions: String(form.get("creativeInstructions") ?? ""),
      assetUrl: String(form.get("assetUrl") ?? ""),
      _honey: String(form.get("_honey") ?? ""),
    };

    try {
      const response = await fetch("/api/stripe/video-ads/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "We could not save your brief. Try again.");
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setError("We could not save your brief. Try again.");
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#E5E5E1] bg-white p-8" role="status">
        <h1 className="text-[32px] font-bold tracking-tight text-[#171717]">We have your order.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[#777773]">
          Payment for the {packageName} package ({priceLabel}) is confirmed, and your brief is saved.
          We&apos;ll confirm your production timeline when your order is accepted.
        </p>
        <Link href="/ads" className="mt-6 inline-flex text-[15px] font-semibold text-[#0866F5]">
          Back to AI Video Ads
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#E5E5E1] bg-white p-6 sm:p-8">
      <h1 className="text-[32px] font-bold tracking-tight text-[#171717]">Tell us about your brand.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#777773]">
        Payment for {packageName} ({priceLabel}) is confirmed. This brief is how we make the video.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {FIELDS.map((field) => (
          <label key={field.name} className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#171717]">
            {field.label}
            <input
              name={field.name}
              type={"type" in field ? field.type : "text"}
              autoComplete={"autoComplete" in field ? field.autoComplete : undefined}
              required
              defaultValue={field.name === "customerName" ? defaultName : field.name === "email" ? defaultEmail : undefined}
              className="rounded-xl border border-[#8F8F8A] px-3 py-2.5 text-[15px] font-normal text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#171717]">
          Creative instructions
          <textarea
            name="creativeInstructions"
            required
            minLength={10}
            rows={5}
            className="rounded-xl border border-[#8F8F8A] px-3 py-2.5 text-[15px] font-normal text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#171717]">
          Link to product assets (optional)
          <input
            name="assetUrl"
            type="url"
            className="rounded-xl border border-[#8F8F8A] px-3 py-2.5 text-[15px] font-normal text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]"
          />
        </label>
        <input name="_honey" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </div>
      {error ? (
        <p className="mt-4 text-[14px] text-[#991B1B]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#0866F5] px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-[#0757D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2 disabled:opacity-70"
      >
        {pending ? "Saving…" : "Submit brief"}
      </button>
    </form>
  );
}
