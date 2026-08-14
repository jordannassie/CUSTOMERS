"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function SalesHeader() {
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
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
              AI Employee
            </Link>
            <a href="/sales" className="text-sm font-medium text-[#0F172A] font-semibold transition-colors">
              Sales Program
            </a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="#apply"
              className="hidden md:inline-flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              Apply to Sales Program
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-3">
            <Link href="/" className="text-sm font-medium text-[#64748B] py-1">AI Employee</Link>
            <a href="/sales" className="text-sm font-semibold text-[#0F172A] py-1">Sales Program</a>
            <a
              href="#apply"
              className="mt-2 inline-flex items-center justify-center bg-[#2563EB] text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              Apply to Sales Program
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
