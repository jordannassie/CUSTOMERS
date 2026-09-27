import {
  Building2,
  Coins,
  Inbox,
  LayoutDashboard,
  Lightbulb,
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
  // Old pages that stay until B-65 and B-66 merge them; they highlight the item that replaces them.
  also?: string[];
};

const BASE = "/internal/admin";

// The six-item menu (MVP_SPEC 9.1, D-35).
export const MAIN_ITEMS: AdminNavItem[] = [
  { label: "Overview", href: BASE, icon: LayoutDashboard },
  { label: "Agencies", href: `${BASE}/accounts`, icon: Building2, also: [`${BASE}/users`, `${BASE}/billing`] },
  { label: "Businesses", href: `${BASE}/businesses`, icon: Store },
  { label: "Scans", href: `${BASE}/scans`, icon: ScanSearch },
  { label: "Usage & Cost", href: `${BASE}/usage`, icon: Coins },
  { label: "Settings", href: `${BASE}/settings`, icon: Settings },
];

// Kept outside the main menu (D-07, D-35).
export const EXTRA_ITEMS: AdminNavItem[] = [
  { label: "Leads", href: `${BASE}/leads`, icon: Inbox },
  { label: "Feature Requests", href: `${BASE}/feature-requests`, icon: Lightbulb },
  { label: "LinkedIn Studio", href: `${BASE}/news`, icon: Newspaper },
];

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActiveItem(item: AdminNavItem, pathname: string): boolean {
  if (item.href === BASE) return pathname === BASE;
  return [item.href, ...(item.also ?? [])].some((href) => matches(pathname, href));
}
