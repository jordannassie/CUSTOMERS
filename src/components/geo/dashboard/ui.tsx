import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  sparkline,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  sparkline?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider truncate">
          {label}
        </span>
        {Icon && <Icon size={14} className="text-[#94A3B8] shrink-0" aria-hidden="true" />}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-black text-[#0F172A] leading-none">{value}</span>
        {trendLabel && trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold mb-0.5 ${
              trend === "up"
                ? "text-[#16A34A]"
                : trend === "down"
                ? "text-[#DC2626]"
                : "text-[#94A3B8]"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp size={11} />
            ) : trend === "down" ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {trendLabel}
          </span>
        )}
      </div>
      {sub && <p className="text-[11px] text-[#94A3B8]">{sub}</p>}
      {sparkline && <div className="mt-2">{sparkline}</div>}
    </div>
  );
}

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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className="text-[#94A3B8]" aria-hidden="true" />}
      </div>
      <p className="text-2xl font-black text-[#0F172A]">{value}</p>
      {hint && <p className="text-[11px] text-[#94A3B8] mt-1">{hint}</p>}
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
    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
      <p className="font-bold text-[#0F172A] mb-1.5">{title}</p>
      <p className="text-sm text-[#64748B] max-w-sm mx-auto mb-5">{body}</p>
      {action}
    </div>
  );
}

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
  medium: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
  low: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
};

export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <span
      className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
        IMPACT_STYLES[impact] ?? IMPACT_STYLES.low
      }`}
    >
      {impact} impact
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-xl font-black text-[#0F172A]">{title}</h1>
        {description && <p className="text-sm text-[#64748B] mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
