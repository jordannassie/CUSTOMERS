"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  MessagesSquare,
  Users,
  Lightbulb,
  Link2,
  Bot,
  FileBarChart,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Visibility", href: "/dashboard/visibility", icon: Radar },
  { label: "Prompts", href: "/dashboard/prompts", icon: MessagesSquare },
  { label: "Competitors", href: "/dashboard/competitors", icon: Users },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Lightbulb },
  { label: "Citations", href: "/dashboard/citations", icon: Link2 },
  { label: "Direct Agent", href: "/dashboard/direct-agent", icon: Bot },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface DashboardShellProps {
  businessName: string;
  children: React.ReactNode;
}

export default function DashboardShell({ businessName, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-gray-100 p-5">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <span className="text-[#0F172A] font-black text-lg tracking-tight">
            Customers<span className="text-[#2563EB]">.Direct</span>
          </span>
        </Link>

        <div className="px-2 mb-6">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Business</p>
          <p className="text-sm font-semibold text-[#0F172A] truncate">{businessName}</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1" aria-label="Dashboard navigation">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB]"
                    : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-gray-50 hover:text-[#0F172A] transition-colors w-full"
          >
            <LogOut size={17} aria-hidden="true" />
            Log out
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-[#0F172A] font-black text-base tracking-tight">
          Customers<span className="text-[#2563EB]">.Direct</span>
        </span>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-xs font-semibold text-[#64748B]">
            Log out
          </button>
        </form>
      </div>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-14" />
        {/* Mobile nav scroller */}
        <div className="lg:hidden overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 flex gap-2 whitespace-nowrap">
          {NAV.map(({ label, href }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                  active ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#64748B] bg-gray-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <main className="p-6 sm:p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
