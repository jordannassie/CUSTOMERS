"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_ITEMS = [
  { label: "How It Works", href: "/ai-search#how-it-works" },
  { label: "Pricing", href: "/ai-search#pricing" },
  { label: "FAQ", href: "/ai-search#faq" },
];

export default function GEOHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg max-w-6xl mx-auto border border-gray-100">
        <div className="flex items-center justify-between py-3 px-6">
          <Link href="/ai-search" aria-label="Customers.Direct — AI Search Visibility" className="flex items-center gap-2">
            <span className="text-[#0F172A] font-black text-lg tracking-tight">
              Customers<span className="text-[#2563EB]">.Direct</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] px-2 py-0.5 rounded-full">
              AI Search
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label="AI Search navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:inline-flex text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors px-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center gap-1.5 bg-[#0F172A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1e293b] transition-colors"
            >
              Check My AI Visibility
              <ArrowRight size={14} aria-hidden="true" />
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

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] py-1"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-semibold text-[#64748B] py-1"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#1e293b] transition-colors"
            >
              Check My AI Visibility
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
