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
  Check,
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

  // Load lazily on first open
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
      onSwitch?.();
      router.push("/dashboard");
      router.refresh();
    } catch {
      // silent no-op
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
    <div className="px-1 mb-4 relative" ref={containerRef}>
      <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 px-1">Your businesses</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={12} className="text-[#94A3B8] shrink-0" />
          <span className="text-[13px] font-semibold text-[#0F172A] truncate">{activeBusinessName}</span>
        </div>
        <ChevronDown size={12} className={`text-[#94A3B8] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 py-1.5 z-50 dropdown-appear"
          style={{ boxShadow: "0 12px 32px rgba(15,23,42,0.14)" }}
          role="listbox"
        >
          {businesses === null && (
            <div className="px-3 py-3 flex items-center gap-2 text-xs text-[#94A3B8]">
              <Loader2 size={12} className="animate-spin" />
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
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="w-4 shrink-0 flex items-center justify-center">
                {b.id === activeBusinessId && <Check size={13} className="text-[#2563EB]" />}
                {switching === b.id && <Loader2 size={12} className="animate-spin text-[#94A3B8]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#0F172A] truncate">{b.name}</span>
                {locationOf(b) && (
                  <span className="block text-[11px] text-[#94A3B8] truncate">{locationOf(b)}</span>
                )}
              </span>
            </button>
          ))}

          <div className="border-t border-slate-100 mt-1 pt-1">
            <Link
              href="/dashboard/add-business"
              onClick={() => { setOpen(false); onSwitch?.(); }}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#2563EB] hover:bg-slate-50 transition-colors"
            >
              <Plus size={13} aria-hidden="true" />
              Add business
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
