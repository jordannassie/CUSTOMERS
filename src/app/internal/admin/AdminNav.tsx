"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const LOGO = "/images/logos/logo-black.png";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/internal/admin",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z" opacity="0.85"/>
      </svg>
    ),
  },
  {
    label: "Leads",
    href: "/internal/admin/leads",
    isLeads: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
      </svg>
    ),
  },
  {
    label: "Accounts",
    href: "/internal/admin/accounts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z"/>
      </svg>
    ),
  },
  {
    label: "Businesses",
    href: "/internal/admin/businesses",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1 3h14v2H1V3zm1 3h12v9H2V6zm2 2v1h4V8H4zm0 3v1h4v-1H4zm6-3v4h2V8h-2z"/>
      </svg>
    ),
  },
  {
    label: "Billing",
    href: "/internal/admin/billing",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1 4h14v9H1V4zm0-2h14v1H1V2zm2 5v1h2V7H3zm0 3v1h4v-1H3zm6-3v4h4V7H9z"/>
      </svg>
    ),
  },
  {
    label: "Pricing",
    href: "/internal/admin/pricing",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10.93V13H7v-1.08A3 3 0 015 9h2a1 1 0 001 1 1 1 0 001-1c0-.55-.45-1-1-1a3 3 0 110-6V2h2v1.07A3 3 0 0111 6H9a1 1 0 10-2 0c0 .55.45 1 1 1a3 3 0 110 6z"/>
      </svg>
    ),
  },
  {
    label: "Scans",
    href: "/internal/admin/scans",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1 10l3-6 3 4 2-2 3 4H1zm13-7a1 1 0 11-2 0 1 1 0 012 0zM0 14h16v1.5H0V14z"/>
      </svg>
    ),
  },
  {
    label: "Usage",
    href: "/internal/admin/usage",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1 13h2V6H1v7zm4 0h2V2H5v11zm4 0h2V8H9v5zm4 0h2V4h-2v9z"/>
      </svg>
    ),
  },
  {
    label: "Errors",
    href: "/internal/admin/errors",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1L1 13h14L8 1zm0 3l4.5 7.8H3.5L8 4zM7 8v2h2V8H7zm0 3v1h2v-1H7z"/>
      </svg>
    ),
  },
  {
    label: "Feature Requests",
    href: "/internal/admin/feature-requests",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M2 2h12v9H9l-3 3v-3H2V2zm2 3v1h8V5H4zm0 3v1h5V8H4z"/>
      </svg>
    ),
  },
  {
    label: "News",
    href: "/internal/admin/news",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1 2h11v1H3v10H1V2zm2 2h11v11H3V4zm2 2v1h7V6H5zm0 3v1h7V9H5zm0 3v1h4v-1H5z"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/internal/admin/settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm5.7-2.7l1.3.8-1.5 2.6-1.4-.5a5 5 0 01-1 .6l-.2 1.5H7l-.2-1.5a5 5 0 01-1-.6l-1.4.5L2.9 8.1l1.3-.8a5 5 0 010-1.2L2.9 5.3l1.5-2.6 1.4.5a5 5 0 011-.6L7 1h2l.2 1.6a5 5 0 011 .6l1.4-.5 1.5 2.6-1.3.8a5 5 0 010 1.2z"/>
      </svg>
    ),
  },
];

export default function AdminNav({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/internal/admin/leads?count=1")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.count != null) setUnreadCount(d.count); })
      .catch(() => {/* ignore */});
  }, [pathname]); // refresh count on navigation

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#F1F5F9]">
        <Link href="/internal/admin">
          <Image src={LOGO} alt="Customers.Direct" width={130} height={28} className="h-6 w-auto" priority />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ label, href, icon, exact, isLeads }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#EFF6FF] text-[#0866F5]"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFD]"
              }`}
            >
              <span className={active ? "text-[#0866F5]" : "text-[#9CA3AF]"}>{icon}</span>
              {label}
              {isLeads && unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-black bg-[#0866F5] text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#F1F5F9]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[12px] font-medium text-[#6B7280] hover:text-[#0866F5] transition-colors mb-3"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 3L1 8l5 5V9.5h8v-3H6V3z"/>
          </svg>
          Back to User View
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#0866F5] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {adminEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-[#111827] truncate">
              {adminEmail.split("@")[0]}
            </p>
            <p className="text-[10px] text-[#9CA3AF]">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
