"use client";

import { useState, useRef, useEffect } from "react";
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
  Bot,
  BookOpen,
  HelpCircle,
  Building2,
} from "lucide-react";

const LOGO =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png";

const PRODUCT_FEATURES = [
  {
    label: "AI Visibility",
    description: "See exactly where AI recommends your business across ChatGPT, Claude, Perplexity, and Gemini.",
    href: "/#ai-visibility",
    icon: BarChart3,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    label: "Competitive Intelligence",
    description: "Discover which competitors AI favors on every prompt, and close the gap.",
    href: "/#competitors",
    icon: Users,
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    label: "Citations & Sources",
    description: "Understand which sources AI cites and find opportunities to appear in them.",
    href: "/#citations",
    icon: Link2,
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    label: "Opportunities",
    description: "Evidence-backed, actionable fixes — each with a ready-made Claude prompt to implement.",
    href: "/#opportunities",
    icon: Lightbulb,
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    label: "Direct Agent",
    description: "Ask anything about your AI visibility. Grounded in real scan data, not hallucinations.",
    href: "/#direct-agent",
    icon: Bot,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
] as const;

const RESOURCES = [
  { label: "How It Works", href: "/how-it-works", icon: BookOpen },
  { label: "FAQ", href: "/ai-search#faq", icon: HelpCircle },
  { label: "Agencies & Resellers", href: "/#agencies", icon: Building2 },
] as const;

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const closeAll = () => {
    setMobileOpen(false);
    setProductOpen(false);
    setResourcesOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 px-4 pt-3">
      <div
        className="bg-white max-w-6xl mx-auto rounded-2xl border border-gray-200/80"
        style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.04)" }}
      >
        <div className="flex items-center justify-between py-2.5 px-4 lg:px-5">

        {/* Logo */}
        <Link href="/" aria-label="Customers.Direct — Home" className="shrink-0">
          <Image
            src={LOGO}
            alt="Customers.Direct"
            width={148}
            height={36}
            priority
            unoptimized
            className="h-7 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">

          {/* Product dropdown */}
          <div className="relative" ref={productRef}>
            <button
              onClick={() => { setProductOpen((v) => !v); setResourcesOpen(false); }}
              className={`flex items-center gap-1 text-[13px] font-medium transition-all duration-150 px-3 py-1.5 rounded-md ${
                productOpen ? "text-[#0F172A] bg-slate-100" : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100"
              }`}
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
                className="absolute left-0 top-full mt-1.5 w-[420px] bg-white rounded-xl border border-slate-200 p-1.5 dropdown-appear"
                style={{ boxShadow: "0 16px 48px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.05)" }}
                role="menu"
              >
                {PRODUCT_FEATURES.map(({ label, description, href, icon: Icon, color, bg }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setProductOpen(false)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon size={14} style={{ color }} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors leading-snug mb-0.5">
                        {label}
                      </p>
                      <p className="text-[11px] text-[#94A3B8] leading-snug">{description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resources dropdown */}
          <div className="relative" ref={resourcesRef}>
            <button
              onClick={() => { setResourcesOpen((v) => !v); setProductOpen(false); }}
              className={`flex items-center gap-1 text-[13px] font-medium transition-all duration-150 px-3 py-1.5 rounded-md ${
                resourcesOpen ? "text-[#0F172A] bg-slate-100" : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100"
              }`}
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
                className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-slate-200 py-1.5 dropdown-appear"
                style={{ boxShadow: "0 16px 48px rgba(15,23,42,0.12)" }}
                role="menu"
              >
                {RESOURCES.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setResourcesOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors group"
                  >
                    <Icon size={13} className="text-[#94A3B8] group-hover:text-[#2563EB] transition-colors shrink-0" />
                    <span className="text-[13px] font-medium text-[#475569] group-hover:text-[#0F172A] transition-colors">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/ai-search#pricing"
            className="text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-all duration-150 px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            Pricing
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden md:inline-flex text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-all duration-150 px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="hidden md:inline-flex items-center gap-1.5 bg-[#2563EB] text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg hover:bg-[#1d4ed8] transition-all duration-150 active:scale-[0.97] whitespace-nowrap"
          >
            Check My AI Visibility
            <ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-5 pt-3 dropdown-appear rounded-b-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2 px-1">
            Product features
          </p>
          <div className="flex flex-col gap-0.5 mb-4">
            {PRODUCT_FEATURES.map(({ label, href, icon: Icon, color, bg }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={13} style={{ color }} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-semibold text-[#0F172A]">{label}</span>
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-col gap-0.5 mb-4">
            {RESOURCES.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="px-3 py-2 text-[13px] font-medium text-[#475569] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/ai-search#pricing"
              onClick={closeAll}
              className="px-3 py-2 text-[13px] font-medium text-[#475569] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              onClick={closeAll}
              className="px-3 py-2 text-[13px] font-medium text-[#475569] hover:text-[#0F172A] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Log in
            </Link>
          </div>

          <Link
            href="/signup"
            onClick={closeAll}
            className="flex items-center justify-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#1d4ed8] transition-colors active:scale-[0.97]"
          >
            Check My AI Visibility — Free
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  </header>
);
}
