"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "cn";
import { PILL_BOX, PILL_CLASS } from "@/components/app/pills";
import { SEVERITY_LABEL, STATUS_LABEL, type AlertSeverity, type AlertStatus, type BellAlert } from "./types";

// The app's pill scheme (components/app/pills.ts), so the box reads like the rest of the app (owner, 2026-11-17: less
// red). Red only marks Critical, as text on its light background (DESIGN.md); High is the light blue "look here
// first" pill, Medium the grey one. The status is quiet text, with a blue dot for a new alert.
const SEVERITY_PILL: Record<AlertSeverity, string> = {
  critical: "bg-low-bg text-low-text",
  high: PILL_CLASS.attention,
  medium: PILL_CLASS.plain,
};

const linkClass = "inline-flex w-fit items-center gap-1 rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

function StatusText({ status }: { status: AlertStatus }) {
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 text-good-text">
        <Check className="size-3" aria-hidden="true" />
        {STATUS_LABEL.resolved}
      </span>
    );
  }
  return <span className={status === "new" ? "font-medium text-foreground" : "text-muted-foreground"}>{STATUS_LABEL[status]}</span>;
}

/** One alert in a bell's box: its level, its status, what happened, where to act, and any extra action (Resolve). */
export function AlertItem({ alert, status, onOpen, actions }: { alert: BellAlert; status: AlertStatus; onOpen: () => void; actions?: React.ReactNode }) {
  const { icon: Icon, severity, title, when, text, link } = alert;
  return (
    <li className="relative flex gap-3 border-b border-border py-3 pr-4 pl-5 last:border-b-0" data-testid="alert-bell-item" data-severity={severity} data-status={status}>
      {status === "new" && <span className="absolute top-[22px] left-2 size-1.5 rounded-full bg-primary" aria-hidden="true" />}
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted", status === "resolved" ? "text-text-hint" : "text-muted-foreground")} aria-hidden="true">
        <Icon className="size-4 stroke-[1.75]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-[length:calc(12.5px*var(--px,1))]">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-[length:calc(13px*var(--px,1))] font-semibold", status === "resolved" ? "text-muted-foreground" : "text-foreground")}>{title}</p>
          {when && <span className="shrink-0 text-[length:calc(11px*var(--px,1))] text-text-hint tabular-nums">{when}</span>}
        </div>
        <div className="flex items-center gap-2 text-[length:calc(11.5px*var(--px,1))]">
          {/* A resolved alert needs no colour: its level stays, in grey. */}
          <span className={cn(PILL_BOX, status === "resolved" ? PILL_CLASS.plain : SEVERITY_PILL[severity])}>{SEVERITY_LABEL[severity]}</span>
          <StatusText status={status} />
        </div>
        <p className="leading-snug text-muted-foreground">{text}</p>
        {(link || actions) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {link &&
              (link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass} onClick={onOpen}>
                  {link.label}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Link href={link.href} className={linkClass} onClick={onOpen}>
                  {link.label}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              ))}
            {actions}
          </div>
        )}
      </div>
    </li>
  );
}
