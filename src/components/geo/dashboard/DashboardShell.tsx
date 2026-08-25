"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  MessagesSquare,
  Users,
  Lightbulb,
  Link2,
  Bot,
  FileBarChart,
  Settings,
  LogOut,
  ChevronsUpDown,
  Check,
  Plus,
  Loader2,
} from "lucide-react";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Visibility", href: "/dashboard/visibility", icon: Radar },
  { label: "Prompts", href: "/dashboard/prompts", icon: MessagesSquare },
  { label: "Competitors", href: "/dashboard/competitors", icon: Users },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Lightbulb },
  { label: "Citations", href: "/dashboard/citations", icon: Link2 },
  { label: "Direct Agent", href: "/dashboard/direct-agent", icon: Bot },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface DashboardShellProps {
  businessId: string;
  businessName: string;
  children: React.ReactNode;
}

export default function DashboardShell({ businessId, businessName, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-gray-100 p-5">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <span className="text-[#0F172A] font-black text-lg tracking-tight">
            Customers<span className="text-[#2563EB]">.Direct</span>
          </span>
        </Link>

        <BusinessSwitcher activeBusinessId={businessId} activeBusinessName={businessName} />

        <nav className="flex flex-col gap-1 flex-1" aria-label="Dashboard navigation">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB]"
                    : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-gray-50 hover:text-[#0F172A] transition-colors w-full"
          >
            <LogOut size={17} aria-hidden="true" />
            Log out
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-[#0F172A] font-black text-base tracking-tight">
          Customers<span className="text-[#2563EB]">.Direct</span>
        </span>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-xs font-semibold text-[#64748B]">
            Log out
          </button>
        </form>
      </div>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-14" />
        {/* Mobile business switcher + nav scroller */}
        <div className="lg:hidden px-4 pt-3">
          <BusinessSwitcher activeBusinessId={businessId} activeBusinessName={businessName} />
        </div>
        <div className="lg:hidden overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 flex gap-2 whitespace-nowrap">
          {NAV.map(({ label, href }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                  active ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#64748B] bg-gray-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <main className="p-6 sm:p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}

interface BusinessSummary {
  id: string;
  name: string;
  domain: string | null;
  primary_city: string | null;
  primary_region: string | null;
}

function BusinessSwitcher({
  activeBusinessId,
  activeBusinessName,
}: {
  activeBusinessId: string;
  activeBusinessName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessSummary[] | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || businesses !== null) return;
    let cancelled = false;
    fetch("/api/geo/businesses")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setBusinesses(data.businesses ?? []);
      })
      .catch(() => {
        if (!cancelled) setBusinesses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, businesses]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function switchTo(id: string) {
    if (id === activeBusinessId) {
      setOpen(false);
      return;
    }
    setSwitching(id);
    try {
      const res = await fetch("/api/geo/businesses/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      if (!res.ok) throw new Error("Could not switch business.");
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch {
      // Leave the dropdown open with the current selection on failure —
      // nothing destructive happened, so a silent no-op is safe here.
    } finally {
      setSwitching(null);
    }
  }

  function locationOf(b: BusinessSummary): string | null {
    if (b.domain) return b.domain;
    if (b.primary_city) return b.primary_region ? `${b.primary_city}, ${b.primary_region}` : b.primary_city;
    return null;
  }

  return (
    <div className="px-2 mb-6 relative" ref={containerRef}>
      <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">Your businesses</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#0F172A] truncate">{activeBusinessName}</span>
        <ChevronsUpDown size={15} className="text-[#94A3B8] shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 py-1.5 z-50"
          style={{ boxShadow: "0 12px 32px rgba(15,23,42,0.14)" }}
          role="listbox"
        >
          {businesses === null && (
            <div className="px-3 py-3 flex items-center gap-2 text-xs text-[#94A3B8]">
              <Loader2 size={13} className="animate-spin" />
              Loading businesses…
            </div>
          )}

          {businesses?.map((b) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={b.id === activeBusinessId}
              onClick={() => switchTo(b.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="w-4 shrink-0">
                {b.id === activeBusinessId && <Check size={14} className="text-[#2563EB]" />}
                {switching === b.id && <Loader2 size={13} className="animate-spin text-[#94A3B8]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[#0F172A] truncate">{b.name}</span>
                {locationOf(b) && (
                  <span className="block text-xs text-[#94A3B8] truncate">{locationOf(b)}</span>
                )}
              </span>
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1.5 pt-1.5">
            <Link
              href="/dashboard/add-business"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-[#2563EB] hover:bg-gray-50 transition-colors"
            >
              <Plus size={15} aria-hidden="true" />
              Add business
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
