import { LayoutDashboard, Lightbulb, Link2, MessageCircleQuestion, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; alsoActiveOn?: string[] };

// D-31. Hrefs point at the current pages; B-51 to B-54 move the rest to /questions and so on.
export const APP_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Competitors", href: "/competitors", icon: Users },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Lightbulb },
  { label: "Questions", href: "/dashboard/prompts", icon: MessageCircleQuestion },
  { label: "Sources", href: "/dashboard/citations", icon: Link2 },
  { label: "Settings", href: "/settings", icon: Settings, alsoActiveOn: ["/dashboard/billing"] },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return [item.href, ...(item.alsoActiveOn ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
