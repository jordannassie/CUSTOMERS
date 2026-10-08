"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { PlatformIcon } from "@/components/PlatformIcon";

const HERO_IMAGE =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Mr.Direct/Offic.png";

const AI_PLATFORMS = [
  { name: "ChatGPT" },
  { name: "Claude" },
  { name: "Perplexity" },
  { name: "Gemini" },
  { name: "Google AI" },
];

const CHECKLIST = [
  "See your AI visibility",
  "Find what to fix",
  "Track your competitors",
  "Get a shareable report",
];

function InlineAIIcon() {
  const [idx, setIdx] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % AI_PLATFORMS.length);
        setVisible(true);
      }, 220);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const platform = AI_PLATFORMS[idx];

  return (
    <span
      className="mx-1.5 inline-flex items-center justify-center rounded-2xl border border-[#E5E5E1] bg-white align-middle shadow-[0_2px_10px_rgba(0,0,0,0.07)]"
      style={{
        width: "clamp(44px, 6vw, 58px)",
        height: "clamp(44px, 6vw, 58px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.82)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
      aria-label={platform.name}
    >
      <PlatformIcon platform={platform.name} size={32} />
    </span>
  );
}

function isValidDomain(value: string): boolean {
  const v = value.trim().replace(/^https?:\/\//i, "").split("/")[0].split("?")[0];
  if (!v) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(v);
}

function HeroCompareBar() {
  const router = useRouter();
  const [myUrl, setMyUrl] = React.useState("");
  const [themUrl, setThemUrl] = React.useState("");
  const myValid = isValidDomain(myUrl);
  const themValid = isValidDomain(themUrl);

  function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const my = myUrl.trim();
    const them = themUrl.trim();
    if (!my || !them) return;
    router.push(`/compare?my=${encodeURIComponent(my)}&them=${encodeURIComponent(them)}`);
  }

  return (
    <form onSubmit={handleCompare} className="w-full">
      <div
        className="rounded-[24px] border border-[#BFDBFE] bg-white p-3 sm:p-4"
        style={{
          boxShadow:
            "0 4px 32px rgba(8,102,245,0.08), 0 8px 48px rgba(8,102,245,0.04), 0 1px 6px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex flex-col gap-2.5">
          <UrlField
            value={myUrl}
            onChange={setMyUrl}
            placeholder="yourbusiness.com"
            label="Your website"
            validLabel="Valid website"
            valid={myValid}
          />
          <div className="relative z-10 -my-1 flex justify-center" aria-hidden="true">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0866F5]"
              style={{
                boxShadow: "0 0 0 3px #ffffff, 0 0 0 5px rgba(8,102,245,0.22), 0 6px 20px rgba(8,102,245,0.32)",
              }}
            >
              <span className="text-[16px] font-black leading-none tracking-tight text-white">VS</span>
            </div>
          </div>
          <UrlField
            value={themUrl}
            onChange={setThemUrl}
            placeholder="competitor.com"
            label="Competitor website"
            validLabel="Valid competitor website"
            valid={themValid}
          />
          <button
            type="submit"
            className="mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0866F5] text-[15px] font-bold text-white transition-colors hover:bg-[#0757D4] active:scale-[0.97]"
            style={{ boxShadow: "0 4px 16px rgba(8,102,245,0.28)" }}
          >
            Compare Free
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-[11.5px] text-[#A3A3A0]">
        Free · No account needed · Results in ~10 seconds
      </p>
    </form>
  );
}

function UrlField({
  value,
  onChange,
  placeholder,
  label,
  validLabel,
  valid,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  validLabel: string;
  valid: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[54px] w-full rounded-[14px] border border-[#E8E8E4] bg-[#F9F9F8] pl-4 pr-11 text-[15px] text-[#171717] transition-all placeholder:text-[#C0C0BB] focus:border-[#BFDBFE] focus:bg-white focus:outline-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
      />
      {valid && (
        <span
          className="pointer-events-none absolute right-3.5 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500"
          role="img"
          aria-label={validLabel}
        >
          <Check size={11} className="text-white" strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

export default function HomeHero() {
  return (
    <div className="mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
      <div className="order-2 lg:order-1">
        <div
          className="overflow-hidden rounded-[28px] bg-[#E8EEF8]"
          style={{ boxShadow: "0 18px 50px rgba(6,59,157,0.12)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Mr. Direct at his desk with AI assistant icons"
            className="aspect-square w-full object-cover object-center"
          />
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div className="mb-5 inline-flex items-center rounded-full border border-[#E5E5E1] bg-[#F0F0EC] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#777773]">
          Get more Customers with AI Search
        </div>

        <h1 className="mb-4 text-[34px] font-bold leading-[1.12] tracking-tight text-[#171717] sm:text-[44px] lg:text-[48px]">
          See who <InlineAIIcon /> AI recommends.
          <br />
          <span className="text-[#0866F5]">You or your competitor?</span>
        </h1>

        <p className="mb-6 max-w-[520px] text-[16px] leading-relaxed text-[#777773] sm:text-[17px]">
          Compare your website against a competitor in AI search. Free, instant, no signup needed.
        </p>

        <HeroCompareBar />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {AI_PLATFORMS.map(({ name }) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#777773]"
            >
              <PlatformIcon platform={name} size={12} />
              {name}
            </span>
          ))}
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[14px] font-medium text-[#171717]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0866F5]">
                <Check size={12} className="text-white" strokeWidth={2.8} aria-hidden="true" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <a
          href="/contact?topic=sales"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#E5E5E1] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#171717] shadow-sm transition-all hover:-translate-y-px hover:bg-[#F5F5F2] hover:shadow-md active:scale-[0.97]"
        >
          Book a Demo
          <ArrowRight size={13} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
