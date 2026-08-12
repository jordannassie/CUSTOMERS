"use client";

import { useState } from "react";
import Image from "next/image";
import { PhoneCall, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Features", id: "features" },
  { label: "Industries", id: "industries" },
  { label: "Pricing", id: "pricing" },
  { label: "Demo", id: "demo" },
];

export default function AIHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 88;
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-6xl mx-auto">
        <div className="flex items-center justify-between py-3 px-6">
          {/* Logo */}
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
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors focus-visible:outline-2 focus-visible:outline-[#2563EB] rounded-sm"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollTo("demo")}
              className="hidden md:inline-flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              <PhoneCall size={14} aria-hidden="true" />
              Hear Your AI Receptionist
            </button>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] text-left transition-colors py-1"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("demo")}
              className="mt-2 inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              <PhoneCall size={14} aria-hidden="true" />
              Hear Your AI Receptionist
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
