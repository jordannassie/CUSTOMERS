"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, CalendarClock, CheckCheck, Settings } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ServiceProblem } from "@/modules/admin";
import { alertKindLabel, type AlertRowData, type OverdueData, type Resolve } from "../_overview/open-alerts";
import { BellItem, iconFor, type Tone } from "./alert-bell-item";

const SERVICE_TONE: Record<ServiceProblem["state"], Tone> = { error: "critical", not_configured: "warning", unknown: "warning" };
const SERVICE_TITLE: Record<ServiceProblem["state"], string> = { error: "not working", not_configured: "not set up", unknown: "could not be checked" };
const serviceKey = (id: string) => `service:${id}`;

export type AlertBellData = { rows: AlertRowData[]; services: ServiceProblem[]; overdue: OverdueData | null };

// Which alerts this admin has seen, kept in this browser only: admin alerts have no read state of their own, only
// open or resolved. The overdue scans line counts as one item with its own key.
const READ_KEY = "admin:read-alerts";
const READ_CHANGED = "admin:read-alerts-changed";
const OVERDUE_ID = "overdue-scans";

function readSnapshot(): string {
  try {
    return window.localStorage.getItem(READ_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(READ_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(READ_CHANGED, onChange);
  };
}

function parseRead(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  try {
    const saved = JSON.parse(raw);
    return new Set(Array.isArray(saved) ? saved.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // A private window or blocked storage: the dots come back on the next visit, nothing else changes.
  }
  window.dispatchEvent(new Event(READ_CHANGED));
}

/**
 * The admin header's alert bell (owner, 2026-11-16): a notification box with every open alert in it, no side panel.
 * Unread ones have a dot and are counted on the bell, in orange (owner: no red); Mark all read clears
 * them; each alert has its link and Resolve, saved in the audit log, right in the box.
 */
export function AlertBell({ data, resolve }: { data: AlertBellData; resolve: Resolve }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  // Null on the server and in the first browser render, so they agree; then what this browser saved.
  const raw = useSyncExternalStore(subscribe, readSnapshot, () => null);
  const read = useMemo(() => parseRead(raw), [raw]);

  const ids = [...(data.overdue ? [OVERDUE_ID] : []), ...data.rows.map((r) => r.id), ...data.services.map((s) => serviceKey(s.id))];
  const isUnread = (id: string) => read !== null && !read.has(id);
  const unread = ids.filter(isUnread);
  const urgentUnread =
    data.rows.some((r) => r.severity === "critical" && isUnread(r.id)) || data.services.some((s) => s.state === "error" && isUnread(serviceKey(s.id)));
  const shown = tab === "unread" ? unread : ids;
  const label =
    ids.length === 0 ? "No open alerts" : `${ids.length} open ${ids.length === 1 ? "alert" : "alerts"}, ${unread.length} unread${urgentUnread ? ", urgent" : ""}`;

  // Only ids still open are kept, so the saved list never grows past the alerts there are.
  const markRead = (more: string[]) => saveRead(new Set([...(read ?? []), ...more].filter((id) => ids.includes(id))));
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label} title={label} data-testid="alert-bell">
          <Bell className="size-[18px] stroke-[1.75]" aria-hidden="true" />
          {unread.length > 0 ? (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[length:calc(10px*var(--px,1))] leading-none font-semibold text-white tabular-nums ring-2 ring-background",
                "bg-mid",
              )}
              data-testid="alert-bell-count"
            >
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          ) : (
            // All read but some still open: a small dot, so open alerts are never forgotten.
            ids.length > 0 && read !== null && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-mid ring-2 ring-background" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} collisionPadding={8} className="w-[calc(360px*var(--px,1))] p-0" data-testid="alert-bell-menu">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="text-[length:calc(14px*var(--px,1))] font-semibold">Alerts</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={unread.length === 0}
              onClick={() => markRead(ids)}
              className="inline-flex items-center gap-1 rounded-sm px-1 text-[length:calc(12px*var(--px,1))] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-text-hint disabled:no-underline"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Mark all read
            </button>
            <Link href="/internal/admin/settings" onClick={close} className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="System status" title="System status">
              <Settings className="size-4 stroke-[1.75]" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div role="tablist" aria-label="Alerts" className="mt-2 flex gap-4 border-b border-border px-4">
          {(["unread", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "relative flex h-8 items-center gap-1.5 text-[length:calc(13px*var(--px,1))] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === t ? "font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "unread" ? "Unread" : "All"}
              <span className={cn("rounded-full px-1.5 text-[length:calc(11px*var(--px,1))] leading-4 tabular-nums", tab === t && t === "unread" && unread.length > 0 ? "bg-mid-bg text-mid-text" : "bg-muted text-muted-foreground")}>
                {t === "unread" ? unread.length : ids.length}
              </span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            {ids.length === 0 ? "No open alerts. Nothing needs a look right now." : "You've read every alert. They stay under All until they're resolved."}
          </p>
        ) : (
          <ul className="scroll-quiet max-h-[min(440px,60dvh)] overflow-y-auto">
            {data.overdue && shown.includes(OVERDUE_ID) && (
              <BellItem
                icon={CalendarClock}
                tone="warning"
                title="Scheduled scans overdue"
                text={`${data.overdue.count === 1 ? "1 business has" : `${data.overdue.count} businesses have`} not been scanned for more than a day after its scheduled date. Check the scan worker and the agency's credits.`}
                unread={isUnread(OVERDUE_ID)}
                link={data.overdue.businesses[0] ? { label: `Open ${data.overdue.businesses[0].name}`, href: `/internal/admin/businesses/${data.overdue.businesses[0].id}` } : undefined}
                onOpen={() => {
                  markRead([OVERDUE_ID]);
                  close();
                }}
              />
            )}
            {data.rows
              .filter((a) => shown.includes(a.id))
              .map((a) => (
                <BellItem
                  key={a.id}
                  icon={iconFor(a.kind)}
                  tone={a.severity as Tone}
                  title={alertKindLabel(a.kind, a.serviceCheck)}
                  when={a.when}
                  text={a.message}
                  unread={isUnread(a.id)}
                  link={a.links[0]}
                  onOpen={() => {
                    markRead([a.id]);
                    close();
                  }}
                  resolve={{ alertId: a.id, run: resolve }}
                />
              ))}
            {/* Services System status shows as broken or not set up: no Resolve, they clear once the service works. */}
            {data.services
              .filter((s) => shown.includes(serviceKey(s.id)))
              .map((s) => (
                <BellItem
                  key={s.id}
                  icon={iconFor(`service_check:${s.id}`)}
                  tone={SERVICE_TONE[s.state]}
                  title={`${s.name} ${SERVICE_TITLE[s.state]}`}
                  text={s.detail}
                  unread={isUnread(serviceKey(s.id))}
                  link={{ label: "Open System status", href: "/internal/admin/settings" }}
                  onOpen={() => {
                    markRead([serviceKey(s.id)]);
                    close();
                  }}
                />
              ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-2 rounded-b-lg border-t border-border px-4 py-2.5 text-[length:calc(12px*var(--px,1))]">
          <span className="text-text-hint">Checked every 15 minutes</span>
          {tab === "unread" && (
            <button type="button" onClick={() => setTab("all")} className="rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50" data-testid="alert-bell-see-all">
              See all alerts
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
