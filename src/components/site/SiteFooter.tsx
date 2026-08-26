import type React from "react";
import Link from "next/link";
import Image from "next/image";

const LOGO = "/images/logos/logo-white.png";

const year = new Date().getFullYear();

const INSTAGRAM_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";
const FACEBOOK_PATH =
  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";

// Small inline SVGs for each AI platform — kept here to avoid extra imports
const AI_PLATFORMS: { name: string; icon: React.ReactNode }[] = [
  {
    name: "ChatGPT",
    icon: (
      <img src="/icons/ai-platforms/chatgpt.svg" alt="" width={14} height={14} className="opacity-60 invert" aria-hidden="true" />
    ),
  },
  {
    name: "Claude",
    // Anthropic "leaf" mark — simple inline SVG
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-60">
        <path d="M13.83 3.52l7.86 13.59a.96.96 0 01-.83 1.44H2.42a.96.96 0 01-.83-1.44L9.45 3.52a.96.96 0 011.66 0l.86 1.48.86-1.48a.96.96 0 011.0 0z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: "Perplexity",
    icon: (
      <img src="/icons/ai-platforms/perplexity.svg" alt="" width={14} height={14} className="opacity-60 invert" aria-hidden="true" />
    ),
  },
  {
    name: "Gemini",
    icon: (
      <img src="/icons/ai-platforms/gemini.svg" alt="" width={14} height={14} className="opacity-60 invert" aria-hidden="true" />
    ),
  },
  {
    name: "Google AI",
    icon: (
      <img src="/icons/ai-platforms/google.svg" alt="" width={14} height={14} className="opacity-60 invert" aria-hidden="true" />
    ),
  },
];

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "AI Visibility", href: "/#ai-visibility" },
      { label: "Competitive Intelligence", href: "/#competitors" },
      { label: "Citations & Sources", href: "/#citations" },
      { label: "Opportunities", href: "/#opportunities" },
      { label: "Direct Agent", href: "/#direct-agent" },
      { label: "Pricing", href: "/ai-search#pricing" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { label: "Local Businesses", href: "/ai-search" },
      { label: "Agencies & Resellers", href: "/#agencies" },
      { label: "Multi-Location", href: "/ai-search" },
      { label: "Marketing Teams", href: "/ai-search" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "AI Search Guide", href: "/ai-search" },
      { label: "FAQ", href: "/ai-search#faq" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
] as const;

export default function SiteFooter() {
  return (
    <footer className="bg-[#171717] text-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand — 2 cols */}
          <div className="lg:col-span-2">
            <Link href="/" aria-label="Customers.Direct" className="inline-block mb-5">
              <Image
                src={LOGO}
                alt="Customers.Direct"
                width={148}
                height={36}
                unoptimized
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-[13px] text-white/50 leading-relaxed mb-6 max-w-xs">
              AI Search Visibility platform. Know where AI recommends your business, understand why competitors rank higher, and fix it.
            </p>

            {/* AI platform coverage */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
                Tracks AI platforms
              </p>
              <div className="flex flex-wrap gap-2">
                {AI_PLATFORMS.map(({ name, icon }) => (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-white/50 bg-white/6 border border-white/10 px-2.5 py-1.5 rounded-md"
                  >
                    {icon}
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Social */}
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/customersdirect"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={INSTAGRAM_PATH} />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61592851422075"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={FACEBOOK_PATH} />
                </svg>
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="font-semibold text-[10px] text-white/30 uppercase tracking-widest mb-4">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/50 hover:text-white/80 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-[12px] text-white/30">
              © {year} Customers.Direct. All rights reserved.
            </p>
            <p className="text-[11px] text-white/20 max-w-sm leading-relaxed">
              AI visibility metrics are measured using real buyer-intent prompts queried via official AI provider APIs. We do not guarantee rankings or placement.
            </p>
          </div>

          <a
            href="/internal/admin"
            className="text-[11px] text-white/10 hover:text-white/30 transition-colors"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
