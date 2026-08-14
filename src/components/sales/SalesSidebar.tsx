import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  UserCheck,
  DollarSign,
  Wrench,
  BookOpen,
  LogOut,
} from "lucide-react";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "My Leads", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "customers", label: "Customers", icon: UserCheck },
  { id: "commissions", label: "Commissions", icon: DollarSign },
  { id: "tools", label: "Sales Tools", icon: Wrench },
  { id: "training", label: "Training", icon: BookOpen },
];

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export default function SalesSidebar({ active, onChange }: Props) {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-6 pb-5 border-b border-gray-100">
        <Link href="/" aria-label="Customers.Direct — Home">
          <Image
            src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png"
            alt="Customers.Direct"
            width={140}
            height={36}
            unoptimized
            className="h-8 w-auto"
          />
        </Link>
        <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
          Sales
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Sales navigation">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors text-left focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
                  : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xs font-black shrink-0">
            JN
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] truncate">Jordan Nassie</p>
            <p className="text-[11px] text-[#64748B] truncate">Sales Representative</p>
          </div>
          <button
            disabled
            className="p-1.5 text-[#94A3B8] cursor-not-allowed"
            aria-label="Sign out (not available in preview)"
            title="Sign out — not available in preview"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
