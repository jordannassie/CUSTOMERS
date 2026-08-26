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
  },
  {
    label: "Competitive Intelligence",
    description: "Discover which competitors AI favors on every prompt, and close the gap.",
    href: "/#competitors",
    icon: Users,
  },
  {
    label: "Citations & Sources",
    description: "Understand which sources AI cites and find opportunities to appear in them.",
    href: "/#citations",
    icon: Link2,
  },
  {
    label: "Opportunities",
    description: "Evidence-backed, actionable fixes — each with a ready-made Claude prompt to implement.",
    href: "/#opportunities",
    icon: Lightbulb,
  },
  {
    label: "Direct Agent",
    description: "Ask anything about your AI visibility. Grounded in real scan data, not hallucinations.",
    href: "/#direct-agent",
    icon: Bot,
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
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeAll = () => {
    setMobileOpen(false);
    setProductOpen(false);
    setResourcesOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-[#FAFAF8] border-b transition-all duration-200 ${
        scrolled ? "border-[#E5E5E1] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]" : "border-[#EEEEEA]"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14">

          {/* Logo */}
          <Link href="/" aria-label="Customers.Direct — Home" className="shrink-0 mr-8">
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
          <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Main navigation">

            {/* Product dropdown */}
            <div className="relative" ref={productRef}>
              <button
                onClick={() => { setProductOpen((v) => !v); setResourcesOpen(false); }}
                className={`flex items-center gap-1 text-[13px] font-medium transition-colors duration-150 px-3 py-1.5 rounded-md ${
                  productOpen
                    ? "text-[#171717] bg-[#F0F0EC]"
                    : "text-[#777773] hover:text-[#171717] hover:bg-[#F0F0EC]"
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
                  className="absolute left-0 top-full mt-1.5 w-[400px] bg-white rounded-xl border border-[#E5E5E1] p-1.5 dropdown-appear"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
                  role="menu"
                >
                  {PRODUCT_FEATURES.map(({ label, description, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setProductOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F5F5F2] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#F0F0EC] border border-[#E5E5E1] flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={14} className="text-[#777773]" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#171717] group-hover:text-[#171717] leading-snug mb-0.5">
                          {label}
                        </p>
                        <p className="text-[11px] text-[#A3A3A0] leading-snug">{description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/ai-search#pricing"
              className="text-[13px] font-medium text-[#777773] hover:text-[#171717] transition-colors duration-150 px-3 py-1.5 rounded-md hover:bg-[#F0F0EC]"
            >
              Pricing
            </Link>

            {/* Resources dropdown */}
            <div className="relative" ref={resourcesRef}>
              <button
                onClick={() => { setResourcesOpen((v) => !v); setProductOpen(false); }}
                className={`flex items-center gap-1 text-[13px] font-medium transition-colors duration-150 px-3 py-1.5 rounded-md ${
                  resourcesOpen
                    ? "text-[#171717] bg-[#F0F0EC]"
                    : "text-[#777773] hover:text-[#171717] hover:bg-[#F0F0EC]"
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
                  className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-[#E5E5E1] py-1.5 dropdown-appear"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                  role="menu"
                >
                  {RESOURCES.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#F5F5F2] transition-colors group"
                    >
                      <Icon size={13} className="text-[#A3A3A0] group-hover:text-[#777773] shrink-0" />
                      <span className="text-[13px] font-medium text-[#777773] group-hover:text-[#171717] transition-colors">
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/#agencies"
              className="text-[13px] font-medium text-[#777773] hover:text-[#171717] transition-colors duration-150 px-3 py-1.5 rounded-md hover:bg-[#F0F0EC]"
            >
              Agencies
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/login"
              className="hidden md:inline-flex text-[13px] font-medium text-[#777773] hover:text-[#171717] transition-colors duration-150 px-3 py-1.5 rounded-md hover:bg-[#F0F0EC]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center gap-1.5 bg-[#171717] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A2A2A] transition-all duration-150 active:scale-[0.97] whitespace-nowrap"
            >
              Check My Visibility
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-[#F0F0EC] transition-colors text-[#777773]"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E5E1] bg-[#FAFAF8] px-4 pb-5 pt-3 dropdown-appear">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A3A3A0] mb-2 px-1">
            Product
          </p>
          <div className="flex flex-col gap-0.5 mb-4">
            {PRODUCT_FEATURES.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F2] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F0F0EC] border border-[#E5E5E1] flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-[#777773]" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-medium text-[#171717]">{label}</span>
              </Link>
            ))}
          </div>

          <div className="border-t border-[#E5E5E1] pt-3 flex flex-col gap-0.5 mb-4">
            <Link
              href="/ai-search#pricing"
              onClick={closeAll}
              className="px-3 py-2 text-[13px] font-medium text-[#777773] hover:text-[#171717] rounded-lg hover:bg-[#F5F5F2] transition-colors"
            >
              Pricing
            </Link>
            {RESOURCES.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="px-3 py-2 text-[13px] font-medium text-[#777773] hover:text-[#171717] rounded-lg hover:bg-[#F5F5F2] transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/#agencies"
              onClick={closeAll}
              className="px-3 py-2 text-[13px] font-medium text-[#777773] hover:text-[#171717] rounded-lg hover:bg-[#F5F5F2] transition-colors"
            >
              Agencies
            </Link>
            <Link
              href="/login"
              onClick={closeAll}
              className="px-3 py-2 text-[13px] font-medium text-[#777773] hover:text-[#171717] rounded-lg hover:bg-[#F5F5F2] transition-colors"
            >
              Log in
            </Link>
          </div>

          <Link
            href="/signup"
            onClick={closeAll}
            className="flex items-center justify-center gap-2 bg-[#171717] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors active:scale-[0.97]"
          >
            Check My AI Visibility
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      )}
    </header>
  );
}
