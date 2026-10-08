import { CreditCard, LayoutDashboard, Lightbulb, Link2, MessageCircleQuestion, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; alsoActiveOn?: string[]; notActiveOn?: string[] };

// Billing pages sit under /settings but have their own sidebar item (BUG-094).
const BILLING_PATHS = ["/settings/billing", "/settings/credits", "/settings/usage"];

// D-31. Hrefs point at the current pages; B-51 moves Opportunities.
export const APP_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Competitors", href: "/competitors", icon: Users },
  { label: "Opportunities", href: "/opportunities", icon: Lightbulb },
  { label: "Questions", href: "/questions", icon: MessageCircleQuestion },
  { label: "Sources", href: "/sources", icon: Link2 },
  { label: "Billing", href: "/settings/billing", icon: CreditCard, alsoActiveOn: BILLING_PATHS.slice(1) },
  { label: "Settings", href: "/settings", icon: Settings, notActiveOn: BILLING_PATHS },
];

const under = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.notActiveOn?.some((p) => under(pathname, p))) return false;
  return [item.href, ...(item.alsoActiveOn ?? [])].some((p) => under(pathname, p));
}
