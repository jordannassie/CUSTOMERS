import { useSyncExternalStore } from "react";
import {
  Activity,
  AppWindow,
  Building2,
  Clapperboard,
  Coins,
  History,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  Newspaper,
  ScanSearch,
  Store,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const BASE = "/internal/admin";

// The six-item menu (MVP_SPEC 9.1, D-35).
export const MAIN_ITEMS: AdminNavItem[] = [
  { label: "Overview", href: BASE, icon: LayoutDashboard },
  { label: "Agencies", href: `${BASE}/agencies`, icon: Building2 },
  { label: "Businesses", href: `${BASE}/businesses`, icon: Store },
  { label: "Scans", href: `${BASE}/scans`, icon: ScanSearch },
  { label: "Usage and cost", href: `${BASE}/usage`, icon: Coins },
  // Was "Settings": nothing there is set, it shows whether each service works (admin review 2026-11-12).
  { label: "System status", href: `${BASE}/settings`, icon: Activity },
];

// Kept outside the main menu (D-07, D-35).
export const EXTRA_ITEMS: AdminNavItem[] = [
  { label: "Leads", href: `${BASE}/leads`, icon: Inbox },
  { label: "Feature requests", href: `${BASE}/feature-requests`, icon: Lightbulb },
  // Every admin action across the admin, newest first (it used to show only per agency).
  { label: "Admin activity", href: `${BASE}/activity`, icon: History },
  { label: "LinkedIn studio", href: `${BASE}/news`, icon: Newspaper },
  // Public site extras merged from main: the /apps directory, its reviews and /ads orders. Each label is also the
  // page's heading, tab title and breadcrumb (admin audit 2026-11-12: three names per page).
  { label: "AI apps", href: `${BASE}/apps`, icon: AppWindow },
  { label: "App reviews", href: `${BASE}/reviews`, icon: MessageSquareText },
  { label: "Video ad orders", href: `${BASE}/video-ads`, icon: Clapperboard },
];

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActiveItem(item: AdminNavItem, pathname: string): boolean {
  if (item.href === BASE) return pathname === BASE;
  return matches(pathname, item.href);
}

// The admin's "Page not found" (not-found.tsx) under a real section's address, such as /internal/admin/leads/abc,
// says so here, so the menu and the breadcrumb do not point at that section (admin audit 2026-11-12).
let missingPath: string | null = null;
const listeners = new Set<() => void>();

export function setMissingPath(path: string | null) {
  missingPath = path;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while the page at `pathname` is the admin's Page not found. */
export function usePageMissing(pathname: string): boolean {
  const missing = useSyncExternalStore(subscribe, () => missingPath, () => null);
  return missing === pathname;
}
