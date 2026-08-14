"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, PhoneCall } from "lucide-react";

export default function MainHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

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

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-5 lg:gap-7"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              AI Employee
            </Link>
            <Link
              href="/customer-acquisition"
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              DM Ads
            </Link>
            <Link
              href="/call-bar"
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Call Bar
            </Link>
          </nav>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <a
              href="tel:9498102010"
              aria-label="Call Customers.Direct at (949) 810-2010"
              className="hidden md:inline-flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors"
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
            <Link
              href="/"
              onClick={close}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] py-1"
            >
              AI Employee
            </Link>
            <Link
              href="/customer-acquisition"
              onClick={close}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] py-1"
            >
              DM Ads
            </Link>
            <Link
              href="/call-bar"
              onClick={close}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] py-1"
            >
              Call Bar
            </Link>
            <a
              href="tel:9498102010"
              onClick={close}
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
