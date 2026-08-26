"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Bot,
  BarChart3,
  MessageCircle,
  PhoneIncoming,
  BookOpen,
  HelpCircle,
  Layers,
} from "lucide-react";

const LOGO =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png";

const PRODUCTS = [
  {
    label: "AI Search Visibility",
    description: "Measure and improve whether ChatGPT, Claude, Perplexity and Google AI recommend your business.",
    href: "/ai-search",
    icon: BarChart3,
    accent: "#7C3AED",
    bg: "#F5F3FF",
    tag: "Most popular",
  },
  {
    label: "AI Employee",
    description: "AI-powered receptionist that answers calls, qualifies leads and books next steps 24/7.",
    href: "/ai-employee",
    icon: Bot,
    accent: "#2563EB",
    bg: "#EFF6FF",
    tag: null,
  },
  {
    label: "DM Ads",
    description: "Turn social engagement into real conversations with done-for-you DM campaigns.",
    href: "/dm-ads",
    icon: MessageCircle,
    accent: "#0891B2",
    bg: "#ECFEFF",
    tag: null,
  },
  {
    label: "Call Bar",
    description: "One-tap mobile call widget for your website — free to build and embed.",
    href: "/call-bar",
    icon: PhoneIncoming,
    accent: "#059669",
    bg: "#ECFDF5",
    tag: "Free",
  },
] as const;

const RESOURCES = [
  { label: "How It Works", href: "/how-it-works", icon: BookOpen },
  { label: "FAQ", href: "/ai-search#faq", icon: HelpCircle },
  { label: "Platform Overview", href: "/", icon: Layers },
] as const;

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (productsRef.current && !productsRef.current.contains(e.target as Node)) {
        setProductsOpen(false);
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
    setProductsOpen(false);
    setResourcesOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" aria-label="Customers.Direct — Home" className="shrink-0 flex items-center gap-2.5">
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
          {/* Products dropdown */}
          <div className="relative" ref={productsRef}>
            <button
              onClick={() => {
                setProductsOpen((v) => !v);
                setResourcesOpen(false);
              }}
              className={`flex items-center gap-1 text-[13px] font-medium transition-colors px-3 py-1.5 rounded-md ${
                productsOpen
                  ? "text-[#0F172A] bg-slate-100"
                  : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100"
              }`}
              aria-expanded={productsOpen}
              aria-haspopup="true"
            >
              Products
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${productsOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {productsOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 w-[460px] bg-white rounded-xl border border-slate-200 p-2"
                style={{ boxShadow: "0 16px 48px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.05)" }}
                role="menu"
              >
                <div className="grid grid-cols-2 gap-0.5">
                  {PRODUCTS.map(({ label, description, href, icon: Icon, accent, bg, tag }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setProductsOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={14} style={{ color: accent }} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="block text-[13px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors leading-snug">
                            {label}
                          </span>
                          {tag && (
                            <span
                              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: bg, color: accent }}
                            >
                              {tag}
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-[#94A3B8] leading-snug">{description}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-1 pt-2 border-t border-slate-100 px-2 pb-0.5">
                  <Link
                    href="/"
                    onClick={() => setProductsOpen(false)}
                    className="flex items-center gap-2 text-[12px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
                  >
                    <Layers size={11} />
                    Platform overview — all products
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Resources dropdown */}
          <div className="relative" ref={resourcesRef}>
            <button
              onClick={() => {
                setResourcesOpen((v) => !v);
                setProductsOpen(false);
              }}
              className={`flex items-center gap-1 text-[13px] font-medium transition-colors px-3 py-1.5 rounded-md ${
                resourcesOpen
                  ? "text-[#0F172A] bg-slate-100"
                  : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100"
              }`}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
            >
              Resources
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${resourcesOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {resourcesOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-slate-200 py-1.5"
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
                    <Icon
                      size={13}
                      className="text-[#94A3B8] group-hover:text-[#2563EB] transition-colors shrink-0"
                    />
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
            className="text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            Pricing
          </Link>

          <Link
            href="/how-it-works"
            className="text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            Company
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden md:inline-flex text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="hidden md:inline-flex items-center gap-1.5 bg-[#2563EB] text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg hover:bg-[#1d4ed8] transition-colors whitespace-nowrap"
          >
            Check My AI Visibility
            <ArrowRight size={12} aria-hidden="true" />
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
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pb-5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2 px-1">
            Products
          </p>
          <div className="flex flex-col gap-0.5 mb-4">
            {PRODUCTS.map(({ label, description, href, icon: Icon, accent, bg }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={13} style={{ color: accent }} aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-[13px] font-semibold text-[#0F172A]">{label}</span>
                  <span className="block text-xs text-[#94A3B8] mt-0.5 line-clamp-1">{description}</span>
                </div>
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
            className="flex items-center justify-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#1d4ed8] transition-colors"
          >
            Check My AI Visibility — Free
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      )}
    </header>
  );
}
