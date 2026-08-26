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
    <div className="bg-white rounded-xl border border-[#E5E5E1] p-5 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider truncate">
          {label}
        </span>
        {Icon && <Icon size={14} className="text-[#D4D4CF] shrink-0" aria-hidden="true" />}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[22px] font-bold text-[#171717] leading-none">{value}</span>
        {trendLabel && trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold mb-0.5 ${
              trend === "up"
                ? "text-[#166534]"
                : trend === "down"
                ? "text-[#991B1B]"
                : "text-[#A3A3A0]"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp size={11} aria-hidden="true" />
            ) : trend === "down" ? (
              <TrendingDown size={11} aria-hidden="true" />
            ) : (
              <Minus size={11} aria-hidden="true" />
            )}
            {trendLabel}
          </span>
        )}
      </div>
      {sub && <p className="text-[11px] text-[#A3A3A0]">{sub}</p>}
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
    <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className="text-[#D4D4CF]" aria-hidden="true" />}
      </div>
      <p className="text-[22px] font-bold text-[#171717]">{value}</p>
      {hint && <p className="text-[11px] text-[#A3A3A0] mt-1">{hint}</p>}
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
    <div className="bg-white rounded-xl border border-dashed border-[#E5E5E1] p-10 text-center">
      <p className="font-semibold text-[#171717] mb-1.5">{title}</p>
      <p className="text-[13px] text-[#777773] max-w-sm mx-auto mb-5">{body}</p>
      {action}
    </div>
  );
}

const IMPACT_STYLES: Record<string, string> = {
  high:   "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
  medium: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  low:    "bg-[#F0F9FF] text-[#0C4A6E] border-[#BAE6FD]",
};

export function ImpactBadge({ impact }: { impact: string }) {
  return (
    <span
      className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
        IMPACT_STYLES[impact.toLowerCase()] ?? IMPACT_STYLES.low
      }`}
    >
      {impact} impact
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E5E1] p-5 ${className}`}>
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
        <h1 className="text-[18px] font-bold text-[#171717]">{title}</h1>
        {description && <p className="text-[13px] text-[#777773] mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[14px] font-semibold text-[#171717]">{children}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: "open" | "in_progress" | "completed" | "dismissed" | string;
}) {
  const styles: Record<string, string> = {
    open:        "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    in_progress: "bg-[#F0F9FF] text-[#0C4A6E] border-[#BAE6FD]",
    completed:   "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
    dismissed:   "bg-[#F5F5F2] text-[#A3A3A0] border-[#E5E5E1]",
  };
  const label: Record<string, string> = {
    open:        "Open",
    in_progress: "In Progress",
    completed:   "Completed",
    dismissed:   "Dismissed",
  };
  return (
    <span
      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        styles[status] ?? styles.dismissed
      }`}
    >
      {label[status] ?? status}
    </span>
  );
}
