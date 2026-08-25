"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PhoneCall, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "AI Employee", href: "/ai-employee" },
  { label: "AI Search Visibility", href: "/ai-search" },
  { label: "DM Ads", href: "/dm-ads" },
  { label: "Call Bar", href: "/call-bar" },
];

export default function AIHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-6xl mx-auto">
        <div className="flex items-center justify-between py-3 px-6">
          {/* Logo */}
          <Link href="/ai-employee" aria-label="Customers.Direct — AI Employee">
            <Image
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png"
              alt="Customers.Direct"
              width={180}
              height={45}
              priority
              unoptimized
              className="h-9 w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-4 lg:gap-5"
            aria-label="AI Employee navigation"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs lg:text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:inline-flex text-xs lg:text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors px-1"
            >
              Log in
            </Link>
            <a
              href="tel:9498102010"
              aria-label="Call Customers.Direct at (949) 810-2010"
              className="hidden md:inline-flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-4 lg:px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              <PhoneCall size={14} aria-hidden="true" />
              (949) 810-2010
            </a>

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

        {/* Mobile dropdown */}
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
              className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] py-1"
            >
              Log in
            </Link>
            <a
              href="tel:9498102010"
              onClick={() => setMobileOpen(false)}
              aria-label="Call Customers.Direct at (949) 810-2010"
              className="mt-2 inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              <PhoneCall size={14} aria-hidden="true" />
              (949) 810-2010
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
