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
  Menu,
  X,
  Check,
  Search,
  ExternalLink,
  TrendingUp,
  Link as LinkIcon,
} from "lucide-react";

const LOGO = "/images/logos/logo-black.png";

const NAV = [
  { label: "Overview",       href: "/dashboard",              icon: LayoutDashboard },
  { label: "AI Insights",    href: "/dashboard/visibility",   icon: Sparkles        },
  { label: "Prompts",        href: "/dashboard/prompts",      icon: MessagesSquare  },
  { label: "Competitors",    href: "/dashboard/competitors",  icon: Users           },
  { label: "SEO Overview",   href: "/dashboard/seo",          icon: Search          },
  { label: "Keywords",       href: "/dashboard/keywords",     icon: TrendingUp      },
  { label: "Backlinks",      href: "/dashboard/backlinks",    icon: LinkIcon        },
  { label: "Sources",        href: "/dashboard/citations",    icon: Link2           },
  { label: "Opportunities",  href: "/dashboard/opportunities",icon: Lightbulb       },
  { label: "Direct Agent",   href: "/dashboard/direct-agent", icon: Bot             },
  { label: "Reports",        href: "/dashboard/reports",      icon: FileBarChart    },
  { label: "Settings",       href: "/dashboard/settings",     icon: Settings        },
];

interface DashboardShellProps {
  businessId: string;
  businessName: string;
  businessLogoUrl?: string | null;
  businessDomain?: string | null;
  children: React.ReactNode;
  /** When true, children fill the full content area with no padding (overview page). Default: false */
  fullBleed?: boolean;
}

export default function DashboardShell({
  businessId,
  businessName,
  businessLogoUrl,
  businessDomain,
  children,
  fullBleed = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[200px] shrink-0 bg-white border-r border-[#E5E5E1] h-screen sticky top-0 overflow-y-auto">
        <SidebarContent
          pathname={pathname}
          businessId={businessId}
          businessName={businessName}
          businessLogoUrl={businessLogoUrl}
          businessDomain={businessDomain}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[200px] bg-white h-full flex flex-col overflow-y-auto border-r border-[#E5E5E1]"
            style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.08)" }}>
            <SidebarContent
              pathname={pathname}
              businessId={businessId}
              businessName={businessName}
              businessLogoUrl={businessLogoUrl}
              businessDomain={businessDomain}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
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
            <Image src={LOGO} alt="Customers.Direct" width={120} height={30} className="h-9 w-auto" />
          </Link>
          <div className="w-8" aria-hidden="true" />
        </div>

        <main className="flex-1 min-w-0">
          {fullBleed ? (
            children
          ) : (
            <div className="p-5 sm:p-8 max-w-[1200px] w-full mx-auto">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** Thin wrapper used by every non-overview dashboard page to get standard padding */
export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-5 sm:p-8 max-w-[1200px] w-full mx-auto">
      {children}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  pathname,
  businessId,
  businessName,
  businessLogoUrl,
  businessDomain,
  onNavClick,
}: {
  pathname: string;
  businessId: string;
  businessName: string;
  businessLogoUrl?: string | null;
  businessDomain?: string | null;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 shrink-0 border-b border-[#EEEEEA]">
        <Link href="/dashboard" aria-label="Customers.Direct — Dashboard" onClick={onNavClick}>
          <Image src={LOGO} alt="Customers.Direct" width={130} height={32} className="h-9 w-auto" />
        </Link>
      </div>

      {/* Quick actions */}
      <div className="px-3 pt-4 pb-2 shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-2 px-1">
          Quick Actions
        </p>
        <BusinessSwitcher
          activeBusinessId={businessId}
          activeBusinessName={businessName}
          activeBusinessLogoUrl={businessLogoUrl}
          activeBusinessDomain={businessDomain}
          onSwitch={onNavClick}
        />
        <button
          className="mt-1.5 w-full flex items-center gap-2 text-[12px] text-[#A3A3A0] px-3 py-2 rounded-lg hover:bg-[#F5F5F2] hover:text-[#777773] transition-colors"
          aria-label="Find anything"
        >
          <Search size={12} aria-hidden="true" />
          Find anything…
        </button>
      </div>

      <div className="mx-3 border-t border-[#EEEEEA]" />

      {/* Pages nav */}
      <nav className="flex-1 px-3 pt-3 flex flex-col gap-px overflow-y-auto" aria-label="Dashboard navigation">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1.5 px-2">
          Pages
        </p>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
                active
                  ? "bg-[#F0F0EC] text-[#171717]"
                  : "text-[#777773] hover:bg-[#F5F5F2] hover:text-[#171717]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={14}
                aria-hidden="true"
                className={active ? "text-[#555552]" : "text-[#A3A3A0]"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-[#EEEEEA] shrink-0">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-[#A3A3A0] hover:bg-[#F5F5F2] hover:text-[#777773] transition-colors w-full"
          >
            <LogOut size={14} aria-hidden="true" />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Business Switcher ────────────────────────────────────────────────────────

interface BusinessSummary {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  primary_city: string | null;
  primary_region: string | null;
}

/** Small square logo or colored-initial fallback — used in both trigger and list */
function BusinessLogo({
  name,
  logoUrl,
  size = 20,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-md object-contain bg-white border border-[#E5E5E1] shrink-0"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
        aria-hidden="true"
      />
    );
  }

  // Colored-initial pill
  const PALETTE = ["#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#EC4899", "#06B6D4"];
  const color = PALETTE[name.length % PALETTE.length];
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="rounded-md flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function BusinessSwitcher({
  activeBusinessId,
  activeBusinessName,
  activeBusinessLogoUrl,
  activeBusinessDomain,
  onSwitch,
}: {
  activeBusinessId: string;
  activeBusinessName: string;
  activeBusinessLogoUrl?: string | null;
  activeBusinessDomain?: string | null;
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
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setBusinesses(d.businesses ?? []); })
      .catch(() => { if (!cancelled) setBusinesses([]); });
    return () => { cancelled = true; };
  }, [open, businesses]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function switchTo(id: string) {
    if (id === activeBusinessId) { setOpen(false); return; }
    setSwitching(id);
    try {
      const res = await fetch("/api/geo/businesses/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      onSwitch?.();
      router.push("/dashboard");
      router.refresh();
    } catch { /* silent */ } finally { setSwitching(null); }
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left rounded-lg border border-[#E5E5E1] px-2.5 py-2 hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch business"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BusinessLogo name={activeBusinessName} logoUrl={activeBusinessLogoUrl} size={20} />
          <span className="text-[12.5px] font-semibold text-[#171717] truncate">{activeBusinessName}</span>
        </div>
        <ChevronDown
          size={11}
          className={`text-[#A3A3A0] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E5E5E1] py-1.5 z-50 dropdown-appear"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
          role="listbox"
          aria-label="Select business"
        >
          {businesses === null && (
            <div className="px-3 py-3 flex items-center gap-2 text-xs text-[#A3A3A0]">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Loading…
            </div>
          )}
          {businesses?.map((b) => (
            <div key={b.id} className="flex items-center group hover:bg-[#F5F5F2] transition-colors">
              <button
                type="button"
                role="option"
                aria-selected={b.id === activeBusinessId}
                onClick={() => switchTo(b.id)}
                className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left"
              >
                <span className="w-4 shrink-0 flex items-center justify-center">
                  {b.id === activeBusinessId && <Check size={13} className="text-[#171717]" aria-hidden="true" />}
                  {switching === b.id && <Loader2 size={12} className="animate-spin text-[#A3A3A0]" aria-hidden="true" />}
                </span>
                <BusinessLogo name={b.name} logoUrl={b.logo_url} size={18} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-[#171717] truncate">{b.name}</span>
                  {b.domain && (
                    <span className="block text-[11px] text-[#A3A3A0] truncate">{b.domain}</span>
                  )}
                </span>
              </button>
              {/* External website link */}
              {b.domain && (
                <a
                  href={`https://${b.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-2 text-[#D4D4CF] hover:text-[#777773] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  aria-label={`Open ${b.domain}`}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}

          {/* Active business website link */}
          {activeBusinessDomain && (
            <div className="border-t border-[#EEEEEA] mt-1 pt-1">
              <a
                href={`https://${activeBusinessDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#777773] hover:text-[#171717] hover:bg-[#F5F5F2] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} aria-hidden="true" />
                {activeBusinessDomain}
              </a>
            </div>
          )}

          <div className={activeBusinessDomain ? "" : "border-t border-[#EEEEEA] mt-1 pt-1"}>
            <Link
              href="/dashboard/add-business"
              onClick={() => { setOpen(false); onSwitch?.(); }}
              className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-[#777773] hover:text-[#171717] hover:bg-[#F5F5F2] transition-colors"
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
