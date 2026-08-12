"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  UserCheck,
  DollarSign,
  Wrench,
  BookOpen,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import SalesOverview from "./SalesOverview";
import SalesLeads from "./SalesLeads";
import SalesPipeline from "./SalesPipeline";
import SalesCustomers from "./SalesCustomers";
import SalesCommissions from "./SalesCommissions";
import SalesTools from "./SalesTools";
import SalesTraining from "./SalesTraining";

type View = "overview" | "leads" | "pipeline" | "customers" | "commissions" | "tools" | "training";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "My Leads", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "customers", label: "Customers", icon: UserCheck },
  { id: "commissions", label: "Commissions", icon: DollarSign },
  { id: "tools", label: "Sales Tools", icon: Wrench },
  { id: "training", label: "Training", icon: BookOpen },
];

function NavItem({
  item,
  active,
  onClick,
}: {
  item: typeof NAV[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors text-left focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
        active
          ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
          : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={17} aria-hidden />
      {item.label}
    </button>
  );
}

function renderView(view: View) {
  switch (view) {
    case "overview": return <SalesOverview />;
    case "leads": return <SalesLeads />;
    case "pipeline": return <SalesPipeline />;
    case "customers": return <SalesCustomers />;
    case "commissions": return <SalesCommissions />;
    case "tools": return <SalesTools />;
    case "training": return <SalesTraining />;
  }
}

export default function SalesDashboard() {
  const [view, setView] = useState<View>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeLabel = NAV.find((n) => n.id === view)?.label ?? "Overview";

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-gray-100 flex-col h-full">
        {/* Logo */}
        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <a href="/" aria-label="Customers.Direct — Home">
            <Image
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png"
              alt="Customers.Direct"
              width={140}
              height={36}
              unoptimized
              className="h-8 w-auto"
            />
          </a>
          <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
            Sales
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Sales navigation">
          {NAV.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={view === item.id}
              onClick={() => setView(item.id as View)}
            />
          ))}
        </nav>

        {/* Profile */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xs font-black shrink-0">
              JN
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0F172A] truncate">Jordan Nassie</p>
              <p className="text-[11px] text-[#64748B] truncate">Sales Representative</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <a href="/" aria-label="Customers.Direct — Home">
            <Image
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png"
              alt="Customers.Direct"
              width={120}
              height={30}
              unoptimized
              className="h-7 w-auto"
            />
          </a>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0F172A]">{activeLabel}</span>
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-3 py-2 shrink-0">
            {NAV.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={view === item.id}
                onClick={() => { setView(item.id); setMobileNavOpen(false); }}
              />
            ))}
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderView(view)}
        </main>
      </div>
    </div>
  );
}
