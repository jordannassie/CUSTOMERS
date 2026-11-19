import {
  CreditCard,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Link2,
  ListChecks,
  MessageCircleQuestion,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; alsoActiveOn?: string[]; notActiveOn?: string[] };
export type NavGroup = { label: string | null; items: NavItem[] };

// Billing pages sit under /settings but have their own sidebar item (BUG-094).
const BILLING_PATHS = ["/settings/billing", "/settings/credits", "/settings/usage"];

/** The comparison page. /compare is the public readiness check, so it lives under Competitors with its own item. */
export const COMPARE_PATH = "/competitors/compare";

// Two plain groups (sidebar redesign, 2026-11-10): every page in "Main" in the user's order, then the account pages.
export const APP_NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Competitors", href: "/competitors", icon: Users, notActiveOn: [COMPARE_PATH] },
      { label: "Compare", href: COMPARE_PATH, icon: GitCompareArrows },
      { label: "Actions", href: "/actions", icon: ListChecks },
      { label: "Reports", href: "/reports", icon: FileText },
      { label: "Questions", href: "/questions", icon: MessageCircleQuestion },
      { label: "Sources", href: "/sources", icon: Link2 },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Billing", href: "/settings/billing", icon: CreditCard, alsoActiveOn: BILLING_PATHS.slice(1) },
      { label: "Settings", href: "/settings", icon: Settings, notActiveOn: BILLING_PATHS },
    ],
  },
];

export const APP_NAV: NavItem[] = APP_NAV_GROUPS.flatMap((g) => g.items);

const under = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.notActiveOn?.some((p) => under(pathname, p))) return false;
  return [item.href, ...(item.alsoActiveOn ?? [])].some((p) => under(pathname, p));
}

/** The menu item the page belongs to, for the breadcrumb. */
export function activeNavItem(pathname: string): NavItem | null {
  return APP_NAV.find((item) => isNavActive(item, pathname)) ?? null;
}

// Pages under Billing's menu item that have their own name (MVP test 2026-11-14: Usage read "Billing").
const PAGE_NAMES: Record<string, string> = { "/settings/usage": "Usage", "/settings/credits": "Buy credits" };

/** The page name for the breadcrumb: its own name when it has one, else its menu item's. */
export function pageLabel(pathname: string): string | null {
  const own = Object.entries(PAGE_NAMES).find(([path]) => under(pathname, path));
  return own?.[1] ?? activeNavItem(pathname)?.label ?? null;
}

// The first scan runs on the business just finished, which is already the active one (step 6b).
const FIRST_SCAN = "/onboarding/first-scan";

/**
 * The name under "Setting up" on setup pages (BUG-092): the draft being set up, or during the first scan the
 * business being scanned. "A new business" only before the draft has a name.
 */
export function setupLabel(pathname: string, draftName: string | null, activeName: string | null): string {
  const name = under(pathname, FIRST_SCAN) ? activeName : draftName;
  return name?.trim() || "A new business";
}
