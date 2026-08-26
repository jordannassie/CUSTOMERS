"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  MessagesSquare,
  Users,
  Lightbulb,
  Link2,
  Bot,
  FileBarChart,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Loader2,
  Globe,
  Menu,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
  { label: "AI Insights", href: "/dashboard/visibility", icon: Sparkles, badge: "NEW" },
  { label: "Prompts", href: "/dashboard/prompts", icon: MessagesSquare, badge: null },
  { label: "Competitors", href: "/dashboard/competitors", icon: Users, badge: null },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Lightbulb, badge: null },
  { label: "Citations", href: "/dashboard/citations", icon: Link2, badge: null },
  { label: "Direct Agent", href: "/dashboard/direct-agent", icon: Bot, badge: null },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart, badge: null },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, badge: null },
];

interface DashboardShellProps {
  businessId: string;
  businessName: string;
  children: React.ReactNode;
}

export default function DashboardShell({ businessId, businessName, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-y-auto">
        <SidebarContent
          pathname={pathname}
          businessId={businessId}
          businessName={businessName}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[220px] bg-white h-full flex flex-col overflow-y-auto shadow-xl">
            <SidebarContent
              pathname={pathname}
              businessId={businessId}
              businessName={businessName}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <span className="text-[#0F172A] font-black text-base tracking-tight">
            Customers<span className="text-[#2563EB]">.Direct</span>
          </span>
          <div className="w-8" />
        </div>

        <main className="flex-1 p-5 sm:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  businessId,
  businessName,
  onNavClick,
}: {
  pathname: string;
  businessId: string;
  businessName: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between shrink-0">
        <Link
          href="/dashboard"
          className="text-[#0F172A] font-black text-[15px] tracking-tight leading-none"
          onClick={onNavClick}
        >
          Customers<span className="text-[#2563EB]">.Direct</span>
        </Link>
      </div>

      {/* Business section */}
      <div className="px-3 mb-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2 px-1">
          Your businesses
        </p>
        <BusinessSwitcher
          activeBusinessId={businessId}
          activeBusinessName={businessName}
          onSwitch={onNavClick}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-slate-100 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Dashboard navigation">
        {NAV.map(({ label, href, icon: Icon, badge }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#2563EB]">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-slate-100 shrink-0">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#94A3B8] hover:bg-slate-50 hover:text-[#64748B] transition-colors w-full"
          >
            <LogOut size={15} aria-hidden="true" />
            Log out
          </button>
        </form>
      </div>
    </>
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
  onSwitch,
}: {
  activeBusinessId: string;
  activeBusinessName: string;
  onSwitch?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessSummary[] | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load businesses on mount so they display inline
  useEffect(() => {
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
  }, []);

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
    if (id === activeBusinessId) return;
    setSwitching(id);
    try {
      const res = await fetch("/api/geo/businesses/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      if (!res.ok) throw new Error("Could not switch business.");
      onSwitch?.();
      router.push("/dashboard");
      router.refresh();
    } catch {
      // silent no-op
    } finally {
      setSwitching(null);
    }
  }

  const showList = businesses && businesses.length > 0;

  return (
    <div ref={containerRef}>
      {/* Selector button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={13} className="text-[#94A3B8] shrink-0" />
        <span className="text-[13px] font-semibold text-[#0F172A] truncate flex-1">{activeBusinessName}</span>
        <ChevronDown size={12} className="text-[#94A3B8] shrink-0" aria-hidden="true" />
      </button>

      {/* Inline business list */}
      {showList && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => switchTo(b.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors text-left ${
                b.id === activeBusinessId
                  ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
                  : "text-[#64748B] hover:bg-slate-50 font-medium"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  b.id === activeBusinessId ? "bg-[#2563EB]" : "bg-slate-300"
                }`}
              />
              <span className="truncate flex-1">{b.name}</span>
              {switching === b.id && (
                <Loader2 size={11} className="animate-spin shrink-0" />
              )}
            </button>
          ))}
          <Link
            href="/dashboard/add-business"
            className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#2563EB] transition-colors"
            onClick={onSwitch}
          >
            <Plus size={12} />
            Add business
          </Link>
        </div>
      )}

      {businesses === null && (
        <div className="mt-2 px-2.5 flex items-center gap-2 text-xs text-[#94A3B8]">
          <Loader2 size={11} className="animate-spin" />
          Loading…
        </div>
      )}

      {/* Dropdown for small screens (when list is too long) */}
      {open && businesses && businesses.length > 4 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 py-1.5 z-50"
          style={{ boxShadow: "0 12px 32px rgba(15,23,42,0.14)" }}
          role="listbox"
        >
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { switchTo(b.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
            >
              <span className={`text-[13px] font-medium ${b.id === activeBusinessId ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                {b.name}
              </span>
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <Link
              href="/dashboard/add-business"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#2563EB] hover:bg-slate-50 transition-colors"
            >
              <Plus size={14} />
              Add business
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
