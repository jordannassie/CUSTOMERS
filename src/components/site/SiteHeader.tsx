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
} from "lucide-react";

const LOGO =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png";

const PRODUCTS = [
  {
    label: "AI Search Visibility",
    descriptor: "Get recommended by AI",
    href: "/ai-search",
    icon: BarChart3,
    accent: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    label: "AI Employee",
    descriptor: "Never miss a customer",
    href: "/ai-employee",
    icon: Bot,
    accent: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    label: "DM Ads",
    descriptor: "Start more conversations",
    href: "/dm-ads",
    icon: MessageCircle,
    accent: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    label: "Call Bar",
    descriptor: "Convert visitors into calls",
    href: "/call-bar",
    icon: PhoneIncoming,
    accent: "#059669",
    bg: "#ECFDF5",
  },
] as const;

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProductsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const closeAll = () => {
    setMobileOpen(false);
    setProductsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-6xl mx-auto border border-gray-100/60">
        <div className="flex items-center justify-between py-3 px-5 lg:px-6">
          {/* Logo */}
          <Link href="/" aria-label="Customers.Direct — Home" className="shrink-0">
            <Image
              src={LOGO}
              alt="Customers.Direct"
              width={160}
              height={40}
              priority
              unoptimized
              className="h-8 lg:h-9 w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-0.5"
            aria-label="Main navigation"
          >
            {/* Products dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProductsOpen((v) => !v)}
                className="flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50"
                aria-expanded={productsOpen}
                aria-haspopup="true"
              >
                Products
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-150 ${
                    productsOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {productsOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-100 py-2"
                  style={{ boxShadow: "0 16px 48px rgba(15,23,42,0.12)" }}
                  role="menu"
                >
                  {PRODUCTS.map(
                    ({ label, descriptor, href, icon: Icon, accent, bg }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => setProductsOpen(false)}
                        className="flex items-center gap-3.5 px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: bg }}
                        >
                          <Icon
                            size={15}
                            style={{ color: accent }}
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                            {label}
                          </span>
                          <span className="block text-xs text-[#94A3B8] mt-0.5">
                            {descriptor}
                          </span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>

            <Link
              href="/how-it-works"
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              How It Works
            </Link>
            <Link
              href="/ai-search#pricing"
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              Pricing
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden md:inline-flex text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors px-2 py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center gap-1.5 bg-[#0F172A] text-white text-sm font-semibold px-4 lg:px-5 py-2.5 rounded-full hover:bg-[#1e293b] transition-colors"
            >
              Check My AI Visibility
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
          <div className="md:hidden border-t border-gray-100 px-5 pb-5 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2 px-1">
              Products
            </p>
            <div className="flex flex-col gap-0.5 mb-4">
              {PRODUCTS.map(({ label, descriptor, href, icon: Icon, accent, bg }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeAll}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={13} style={{ color: accent }} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-[#0F172A]">
                      {label}
                    </span>
                    <span className="block text-xs text-[#94A3B8]">
                      {descriptor}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3 flex flex-col gap-0.5 mb-4">
              <Link
                href="/how-it-works"
                onClick={closeAll}
                className="px-3 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-gray-50 transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/ai-search#pricing"
                onClick={closeAll}
                className="px-3 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                onClick={closeAll}
                className="px-3 py-2 text-sm font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Log in
              </Link>
            </div>

            <Link
              href="/signup"
              onClick={closeAll}
              className="flex items-center justify-center gap-2 bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#1e293b] transition-colors"
            >
              Check My AI Visibility
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
