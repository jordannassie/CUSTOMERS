"use client";

import Link from "next/link";
import Image from "next/image";
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
  X,
  Check,
} from "lucide-react";

const LOGO = "/images/logos/logo-black.png";

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
    <div className="min-h-screen bg-[#FAFAF8] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 bg-white border-r border-[#E5E5E1] h-screen sticky top-0 overflow-y-auto">
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
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[220px] bg-white h-full flex flex-col overflow-y-auto border-r border-[#E5E5E1]" style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.08)" }}>
            <SidebarContent
              pathname={pathname}
              businessId={businessId}
              businessName={businessName}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#E5E5E1] px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-[#F5F5F2] transition-colors text-[#777773]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <Link href="/dashboard" aria-label="Customers.Direct — Dashboard">
            <Image
              src={LOGO}
              alt="Customers.Direct"
              width={120}
              height={30}
              unoptimized
              className="h-6 w-auto"
            />
          </Link>
          <div className="w-8" aria-hidden="true" />
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
      <div className="px-4 pt-5 pb-3 shrink-0 border-b border-[#EEEEEA]">
        <Link
          href="/dashboard"
          aria-label="Customers.Direct — Dashboard"
          onClick={onNavClick}
        >
          <Image
            src={LOGO}
            alt="Customers.Direct"
            width={130}
            height={32}
            unoptimized
            className="h-6 w-auto"
          />
        </Link>
      </div>

      {/* Business selector */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#A3A3A0] mb-1.5 px-1">
          Business
        </p>
        <BusinessSwitcher
          activeBusinessId={businessId}
          activeBusinessName={businessName}
          onSwitch={onNavClick}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-[#EEEEEA] mb-2" />

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto pb-2" aria-label="Dashboard navigation">
        {NAV.map(({ label, href, icon: Icon, badge }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#F0F0EC] text-[#171717]"
                  : "text-[#777773] hover:bg-[#F5F5F2] hover:text-[#171717]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={15}
                aria-hidden="true"
                className={active ? "text-[#171717]" : "text-[#A3A3A0]"}
              />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#EEEEEA] text-[#777773]">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-[#EEEEEA] shrink-0">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#A3A3A0] hover:bg-[#F5F5F2] hover:text-[#777773] transition-colors w-full"
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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left rounded-lg border border-[#E5E5E1] px-3 py-2 hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch business"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={12} className="text-[#A3A3A0] shrink-0" aria-hidden="true" />
          <span className="text-[13px] font-medium text-[#171717] truncate">{activeBusinessName}</span>
        </div>
        <ChevronDown
          size={12}
          className={`text-[#A3A3A0] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E5E5E1] py-1.5 z-50 dropdown-appear"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
          role="listbox"
          aria-label="Select business"
        >
          {businesses === null && (
            <div className="px-3 py-3 flex items-center gap-2 text-xs text-[#A3A3A0]">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
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
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F5F5F2] transition-colors"
            >
              <span className="w-4 shrink-0 flex items-center justify-center">
                {b.id === activeBusinessId && <Check size={13} className="text-[#171717]" aria-hidden="true" />}
                {switching === b.id && <Loader2 size={12} className="animate-spin text-[#A3A3A0]" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#171717] truncate">{b.name}</span>
                {locationOf(b) && (
                  <span className="block text-[11px] text-[#A3A3A0] truncate">{locationOf(b)}</span>
                )}
              </span>
            </button>
          ))}

          <div className="border-t border-[#EEEEEA] mt-1 pt-1">
            <Link
              href="/dashboard/add-business"
              onClick={() => { setOpen(false); onSwitch?.(); }}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#777773] hover:text-[#171717] hover:bg-[#F5F5F2] transition-colors"
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
