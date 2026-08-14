"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PhoneCall, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "AI Employee", href: "/" },
  { label: "DM Ads / Customer Acquisition", href: "/customer-acquisition" },
  { label: "Call Bar", href: "/call-bar" },
];

export default function AIHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-6xl mx-auto">
        <div className="flex items-center justify-between py-3 px-6">
          {/* Logo */}
          <Link href="/" aria-label="Customers.Direct — Home">
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
            <Link
              href="/#how-it-works"
              className="hidden xl:inline text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/#pricing"
              className="hidden xl:inline text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href="/#demo"
              className="hidden md:inline-flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-4 lg:px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              <PhoneCall size={14} aria-hidden="true" />
              Contact / Book Call
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
              href="/#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] py-1"
            >
              How It Works
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] py-1"
            >
              Pricing
            </Link>
            <Link
              href="/#demo"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              <PhoneCall size={14} aria-hidden="true" />
              Contact / Book Call
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
