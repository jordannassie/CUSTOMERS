import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 4px 20px rgba(15,23,42,0.05)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={15} className="text-[#94A3B8]" aria-hidden="true" />}
      </div>
      <p className="text-3xl font-black text-[#0F172A]">{value}</p>
      {hint && <p className="text-xs text-[#94A3B8] mt-1.5">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <p className="font-bold text-[#0F172A] mb-1.5">{title}</p>
      <p className="text-sm text-[#64748B] max-w-sm mx-auto mb-5">{body}</p>
      {action}
    </div>
  );
}

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
  medium: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
  low: "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]",
};

export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${IMPACT_STYLES[impact] ?? IMPACT_STYLES.low}`}>
      {impact} impact
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-6 ${className}`}
      style={{ boxShadow: "0 4px 20px rgba(15,23,42,0.05)" }}
    >
      {children}
    </div>
  );
}
