"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterSelect } from "./alert-filters";
import { AlertItem } from "./alert-item";
import { useReadAlerts } from "./read-alerts";
import { SEVERITIES, SEVERITY_LABEL, STATUS_LABEL, sortAlerts, type AlertSeverity, type AlertStatus, type BellAlert } from "./types";

type Props = {
  alerts: BellAlert[];
  /** Where this browser keeps which alerts were opened; one per bell. */
  storageKey: string;
  /** The statuses this bell has: admins also see Resolved ones. */
  statuses: AlertStatus[];
  /** A page with more, as an icon in the box's header (admin: System status). */
  headerLink?: { href: string; label: string; icon: LucideIcon };
  /** A line at the foot of the box: how often the alerts are checked. */
  footer: string;
  /** What to show when nothing is open at all. */
  emptyText: string;
  /** More for one alert, next to its link (admin: Resolve). */
  actions?: (alert: BellAlert) => React.ReactNode;
};

/**
 * The alert bell for admins and customers alike (owner, 2026-11-17): a box with every alert, its level (Critical, High,
 * Medium) and status (New, Seen, Resolved), filtered by level and status. New open alerts are counted
 * on the bell in red; opening one, or Mark all read, makes it Seen in this browser.
 */
export function AlertCenter({ alerts, storageKey, statuses, headerLink, footer, emptyText, actions }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AlertSeverity | "all">("all");
  const [status, setStatus] = useState<AlertStatus | "all">("all");
  const openIds = alerts.filter((a) => !a.resolved).map((a) => a.id);
  const { read, markRead } = useReadAlerts(storageKey, openIds);

  const statusOf = (a: BellAlert): AlertStatus => (a.resolved ? "resolved" : read !== null && !read.has(a.id) ? "new" : "seen");
  const fresh = alerts.filter((a) => statusOf(a) === "new");
  const urgent = fresh.some((a) => a.severity === "critical");
  const shown = sortAlerts(alerts).filter((a) => (category === "all" || a.severity === category) && (status === "all" || statusOf(a) === status));
  const filtered = category !== "all" || status !== "all";
  const label =
    openIds.length === 0
      ? "Alerts, none open"
      : `Alerts, ${openIds.length} open, ${fresh.length} new${urgent ? ", including critical" : ""}`;
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label} title={label} data-testid="alert-bell">
          <Bell className="size-[18px] stroke-[1.75]" aria-hidden="true" />
          {fresh.length > 0 ? (
            <span
              className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-low px-1 text-[length:calc(10px*var(--px,1))] leading-none font-semibold text-white tabular-nums ring-2 ring-background"
              data-testid="alert-bell-count"
            >
              {fresh.length > 99 ? "99+" : fresh.length}
            </span>
          ) : (
            // All seen but some still open: a small red dot, so open alerts are never forgotten.
            openIds.length > 0 && read !== null && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-low ring-2 ring-background" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} collisionPadding={8} className="w-[calc(380px*var(--px,1))] max-w-[calc(100vw-16px)] p-0" data-testid="alert-bell-menu">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="text-[length:calc(14px*var(--px,1))] font-semibold">Alerts</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={fresh.length === 0}
              onClick={() => markRead(openIds)}
              className="inline-flex items-center gap-1 rounded-sm px-1 text-[length:calc(12px*var(--px,1))] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-text-hint disabled:no-underline"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Mark all read
            </button>
            {headerLink && (
              <Link
                href={headerLink.href}
                onClick={close}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={headerLink.label}
                title={headerLink.label}
              >
                <headerLink.icon className="size-4 stroke-[1.75]" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-4 pt-2 pb-3">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <FilterSelect
              name="Category"
              allLabel="All levels"
              value={category}
              onChange={setCategory}
              options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABEL[s], count: alerts.filter((a) => a.severity === s).length }))}
            />
            <FilterSelect
              name="Status"
              allLabel="All statuses"
              value={status}
              onChange={setStatus}
              options={statuses.map((s) => ({ value: s, label: STATUS_LABEL[s], count: alerts.filter((a) => statusOf(a) === s).length }))}
            />
          </div>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setStatus("all");
              }}
              className="shrink-0 rounded-sm text-[length:calc(12px*var(--px,1))] font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Clear
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-[length:calc(13px*var(--px,1))] text-muted-foreground" data-testid="alert-bell-empty">
            {alerts.length === 0 ? emptyText : "No alerts match these filters."}
          </p>
        ) : (
          <ul className="scroll-quiet max-h-[min(440px,60dvh)] overflow-y-auto">
            {shown.map((a) => (
              <AlertItem
                key={a.id}
                alert={a}
                status={statusOf(a)}
                onOpen={() => {
                  if (!a.resolved) markRead([a.id]);
                  close();
                }}
                actions={a.resolved ? undefined : actions?.(a)}
              />
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 rounded-b-lg border-t border-border px-4 py-2.5 text-[length:calc(12px*var(--px,1))]">
          <span className="text-text-hint">{footer}</span>
          <span className="shrink-0 whitespace-nowrap text-text-hint tabular-nums">
            {shown.length} of {alerts.length}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
