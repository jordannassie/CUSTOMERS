import {
  AppWindow,
  Building2,
  Clapperboard,
  Coins,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  Newspaper,
  ScanSearch,
  Settings,
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
  { label: "Settings", href: `${BASE}/settings`, icon: Settings },
];

// Kept outside the main menu (D-07, D-35).
export const EXTRA_ITEMS: AdminNavItem[] = [
  { label: "Leads", href: `${BASE}/leads`, icon: Inbox },
  { label: "Feature requests", href: `${BASE}/feature-requests`, icon: Lightbulb },
  { label: "LinkedIn studio", href: `${BASE}/news`, icon: Newspaper },
  // Public site extras merged from main: the /apps directory, its reviews and /ads orders.
  { label: "Apps", href: `${BASE}/apps`, icon: AppWindow },
  { label: "Reviews", href: `${BASE}/reviews`, icon: MessageSquareText },
  { label: "Video ads", href: `${BASE}/video-ads`, icon: Clapperboard },
];

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActiveItem(item: AdminNavItem, pathname: string): boolean {
  if (item.href === BASE) return pathname === BASE;
  return matches(pathname, item.href);
}
