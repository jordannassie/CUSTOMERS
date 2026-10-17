"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { isAllowedEmbedSrc, type NewsletterPlacement } from "@/modules/newsletter/signup";

const COPY = {
  hero: {
    title: "Don't Let AI Replace You.",
    text: "Discover one new AI tool every day to help grow your business.",
  },
  compact: {
    title: "Discover a New AI Tool Every Day.",
    text: "Join the free AI newsletter from Customers.Direct.",
  },
  detail: {
    title: "Don't Let AI Replace You.",
    text: "Discover one new AI tool every day to help grow your business.",
  },
  footer: {
    title: "Don't Let AI Replace You.",
    text: "Discover one new AI tool every day to help grow your business.",
  },
} as const;

function BeehiivEmbed({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || document.querySelector("script[data-customers-beehiiv]")) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.customersBeehiiv = "true";
    root.appendChild(script);
  }, [src]);
  return <div ref={ref} className="mt-4 min-h-[88px] w-full" />;
}

export function NewsletterSignup({
  placement,
  variant,
  embedSrc,
  embed = false,
}: {
  placement: NewsletterPlacement;
  variant: keyof typeof COPY;
  embedSrc?: string | null;
  embed?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || seen.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      seen.current = true;
      observer.disconnect();
      void fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "impression", placement }),
      }).catch(() => undefined);
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [placement]);

  const copy = COPY[variant];
  const showEmbed = embed && isAllowedEmbedSrc(embedSrc);
  const dark = variant === "footer";
  const band = variant === "hero";
  const href = `/newsletter/go/${placement}`;

  return (
    <section
      ref={sectionRef}
      id={placement === "homepage" ? "newsletter" : `newsletter-${placement}`}
      className={dark ? "mb-10 rounded-2xl border border-white/10 bg-white/5 px-5 py-5" : variant === "compact" ? "mt-5 rounded-2xl border border-[#BFDBFE] bg-white px-4 py-4" : variant === "detail" ? "mt-4 scroll-mt-28 rounded-2xl border border-[#BFDBFE] bg-[#FAFAF8] p-5 sm:p-6" : "scroll-mt-28 border-b border-[#EEEEEA] bg-white px-4 py-8 sm:py-10"}
      aria-label="AI newsletter"
    >
      <div className={band ? "mx-auto max-w-[880px] rounded-2xl border border-[#BFDBFE] bg-[#FAFAF8] px-5 py-6 sm:px-8 sm:py-8" : ""}>
        <h2 className={dark ? "text-[20px] font-bold text-white" : variant === "compact" ? "text-[18px] font-bold text-[#171717]" : "text-[28px] font-bold tracking-tight text-[#171717] sm:text-[34px]"}>{copy.title}</h2>
        <p className={dark ? "mt-1 max-w-xl text-[13px] text-white/60" : "mt-2 max-w-xl text-[15px] text-[#777773]"}>{copy.text}</p>
        {showEmbed ? <BeehiivEmbed src={embedSrc} /> : (
          <a href={href} className={`mt-4 inline-flex h-11 items-center justify-center rounded-full px-5 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] ${dark ? "bg-white text-[#0866F5]" : "bg-[#0866F5] text-white hover:bg-[#0757D4]"}`}>
            Join the Free AI Newsletter
          </a>
        )}
        <p className={dark ? "mt-3 text-[11px] text-white/40" : "mt-3 text-[12px] text-[#A3A3A0]"}>
          Beehiiv sends the newsletter and confirms the signup. Read the <Link href="/privacy" className={dark ? "underline" : "font-semibold text-[#0866F5]"}>privacy policy</Link>.
        </p>
      </div>
    </section>
  );
}
