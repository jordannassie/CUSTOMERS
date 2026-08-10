"use client";

import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-6xl mx-auto">
        <div className="flex items-center justify-between py-3 px-6">
          {/* Logo — always returns to top of homepage */}
          <a href="/" aria-label="Customers.Direct — Home">
            <Image
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png"
              alt="Customers.Direct"
              width={180}
              height={45}
              priority
              unoptimized
              className="h-9 w-auto"
            />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo("industries")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Industries
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Pricing
            </button>
          </nav>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollTo("strategy-call")}
              className="hidden md:inline-flex items-center bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              Book a Strategy Call
            </button>

            {/* Hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-3">
            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] text-left transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo("industries")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] text-left transition-colors"
            >
              Industries
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] text-left transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollTo("strategy-call")}
              className="mt-1 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              Book a Strategy Call
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
