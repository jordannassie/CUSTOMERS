"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  BarChart3,
  Users,
  Link2,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Building2,
  Mail,
} from "lucide-react";
import BotIcon from "@/components/BotIcon";

// Wrapper so BotIcon fits the lucide icon signature used in PRODUCT_FEATURES
const BotNavIcon = ({ size, className }: { size?: number; className?: string; "aria-hidden"?: boolean | string }) => (
  <BotIcon size={size} className={className} />
);

const LOGO_WHITE = "/images/logos/logo-white.png";

const NAV_GRADIENT = "linear-gradient(110deg, #063B9D 0%, #0866F5 55%, #168BFF 100%)";
const NAV_SHADOW   = "0 14px 32px rgba(6, 59, 157, 0.20), inset 0 1px 0 rgba(255,255,255,0.18)";

const PRODUCT_FEATURES = [
  {
    label: "AI Visibility",
    description: "See exactly where AI recommends your business across ChatGPT, Claude, Perplexity, and Gemini.",
    href: "/#ai-visibility",
    icon: BarChart3,
    bg: "bg-blue-500",
    shadow: "shadow-blue-200",
  },
  {
    label: "Competitive Intelligence",
    description: "Discover which competitors AI favors on every prompt, and close the gap.",
    href: "/#competitors",
    icon: Users,
    bg: "bg-violet-500",
    shadow: "shadow-violet-200",
  },
  {
    label: "Citations & Sources",
    description: "Understand which sources AI cites and find opportunities to appear in them.",
    href: "/#citations",
    icon: Link2,
    bg: "bg-teal-500",
    shadow: "shadow-teal-200",
  },
  {
    label: "Opportunities",
    description: "Evidence-backed, actionable fixes — each with a ready-made Claude prompt to implement.",
    href: "/#opportunities",
    icon: Lightbulb,
    bg: "bg-orange-500",
    shadow: "shadow-orange-200",
  },
  {
    label: "Direct Agent",
    description: "Ask anything about your AI visibility. Grounded in real scan data, not hallucinations.",
    href: "/#direct-agent",
    icon: BotNavIcon,
    bg: "bg-pink-500",
    shadow: "shadow-pink-200",
  },
] as const;

const RESOURCES = [
  { label: "How It Works",         href: "/#how-it-works", icon: BookOpen  },
  { label: "FAQ",                  href: "/#faq",           icon: HelpCircle },
  { label: "Agencies & Resellers", href: "/agency",          icon: Building2  },
  { label: "Contact",              href: "/contact",         icon: Mail      },
] as const;

export default function SiteHeader() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [productOpen,  setProductOpen]  = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const productRef   = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  /**
   * Navigate to a product feature section.
   * When already on the homepage, setting window.location.hash directly
   * fires the `hashchange` event so ProductTabsSection activates the right tab.
   * Next.js <Link href="/#hash"> uses pushState which does NOT fire hashchange.
   */
  const navigateToFeature = useCallback((href: string) => {
    setProductOpen(false);
    setMobileOpen(false);
    if (typeof window === "undefined") return;
    const hash = href.replace("/#", "#");
    if (window.location.pathname === "/") {
      // Same page — set hash directly to trigger hashchange + tab activation
      window.location.hash = hash;
    } else {
      window.location.href = href;
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (productRef.current   && !productRef.current.contains(e.target as Node))   setProductOpen(false);
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMobileOpen(false); setProductOpen(false); setResourcesOpen(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeAll = () => {
    setMobileOpen(false);
    setProductOpen(false);
    setResourcesOpen(false);
  };

  // Shared nav-link classes (desktop, inside gradient bar)
  const navLink = (active = false) =>
    `flex items-center gap-1 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
      active
        ? "text-white bg-white/15"
        : "text-white/80 hover:text-white hover:bg-white/10"
    }`;

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 py-3 pointer-events-none">
      {/* ── Floating gradient nav bar ───────────────────────────────────── */}
      <div
        className="max-w-[1200px] mx-auto rounded-[20px] pointer-events-auto"
        style={{ background: NAV_GRADIENT, boxShadow: NAV_SHADOW }}
      >
        <div className="flex items-center h-[68px] px-5">

          {/* Logo */}
          <Link
            href="/"
            aria-label="Customers.Direct — Home"
            className="shrink-0 mr-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-md"
          >
            <Image
              src={LOGO_WHITE}
              alt="Customers.Direct"
              width={160}
              height={40}
              priority
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Main navigation">

            {/* Product dropdown */}
            <div className="relative" ref={productRef}>
              <button
                onClick={() => { setProductOpen((v) => !v); setResourcesOpen(false); }}
                className={navLink(productOpen)}
                aria-expanded={productOpen}
                aria-haspopup="true"
              >
                Product
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${productOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {productOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-[420px] bg-white rounded-2xl border border-[#E5E5E1] p-2 dropdown-appear"
                  style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
                  role="menu"
                >
                  {PRODUCT_FEATURES.map(({ label, description, href, icon: Icon, bg, shadow }) => (
                    <button
                      key={href}
                      type="button"
                      role="menuitem"
                      onClick={() => navigateToFeature(href)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F5F5F2] transition-colors group w-full text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl ${bg} ${shadow} shadow-md flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={15} className="text-white" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#171717] leading-snug mb-0.5">
                          {label}
                        </p>
                        <p className="text-[11px] text-[#A3A3A0] leading-snug">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/pricing" className={navLink()}>Pricing</Link>

            {/* Resources dropdown */}
            <div className="relative" ref={resourcesRef}>
              <button
                onClick={() => { setResourcesOpen((v) => !v); setProductOpen(false); }}
                className={navLink(resourcesOpen)}
                aria-expanded={resourcesOpen}
                aria-haspopup="true"
              >
                Resources
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {resourcesOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl border border-[#E5E5E1] py-2 dropdown-appear"
                  style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}
                  role="menu"
                >
                  {RESOURCES.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F5F5F2] transition-colors group"
                    >
                      <Icon size={13} className="text-[#A3A3A0] group-hover:text-[#777773] shrink-0" aria-hidden="true" />
                      <span className="text-[13px] font-medium text-[#777773] group-hover:text-[#171717] transition-colors">
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/agency" className={navLink()}>Agencies</Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Log in (desktop) */}
            <Link
              href="/login"
              className="hidden md:inline-flex text-[13px] font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Log in
            </Link>

            {/* CTA pill (desktop) */}
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center gap-1.5 bg-white text-[#0866F5] text-[13px] font-semibold px-5 py-2 rounded-full border border-white/30 shadow-sm hover:bg-blue-50 hover:-translate-y-px hover:shadow-md transition-all duration-150 active:scale-[0.97] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Check My Visibility
              <ArrowRight size={12} aria-hidden="true" />
            </Link>

            {/* Hamburger (mobile) */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu (floating, same gradient) ───────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden max-w-[1200px] mx-auto mt-2 rounded-[20px] px-5 pb-5 pt-4 dropdown-appear pointer-events-auto"
          style={{ background: NAV_GRADIENT, boxShadow: NAV_SHADOW }}
        >
          {/* Product section */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 px-1">
            Product
          </p>
          <div className="flex flex-col gap-px mb-4">
            {PRODUCT_FEATURES.map(({ label, href, icon: Icon, bg }) => (
              <button
                key={href}
                type="button"
                onClick={() => navigateToFeature(href)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors w-full text-left"
              >
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0 opacity-90`}>
                  <Icon size={13} className="text-white" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-medium text-white/85">{label}</span>
              </button>
            ))}
          </div>

          {/* Other links */}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-px mb-5">
            <Link href="/pricing" onClick={closeAll}
              className="px-3 py-2.5 text-[13px] font-medium text-white/85 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              Pricing
            </Link>
            {RESOURCES.map(({ label, href }) => (
              <Link key={href} href={href} onClick={closeAll}
                className="px-3 py-2.5 text-[13px] font-medium text-white/85 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                {label}
              </Link>
            ))}
            <Link href="/agency" onClick={closeAll}
              className="px-3 py-2.5 text-[13px] font-medium text-white/85 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              Agencies
            </Link>
            <Link href="/login" onClick={closeAll}
              className="px-3 py-2.5 text-[13px] font-medium text-white/85 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              Log in
            </Link>
          </div>

          {/* CTA */}
          <Link
            href="/signup"
            onClick={closeAll}
            className="flex items-center justify-center gap-2 bg-white text-[#0866F5] text-sm font-bold px-5 py-3 rounded-full border border-white/30 shadow-sm hover:bg-blue-50 transition-all active:scale-[0.97]"
          >
            Check My AI Visibility
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </header>
  );
}
