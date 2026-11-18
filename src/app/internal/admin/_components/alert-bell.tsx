"use client";

import { CalendarClock, Settings } from "lucide-react";
import { AlertCenter } from "@/components/alerts/alert-center";
import type { AlertSeverity, BellAlert } from "@/components/alerts/types";
import type { ServiceProblem } from "@/modules/admin";
import { alertKindLabel, type AlertRowData, type OverdueData, type Resolve } from "../_overview/open-alerts";
import { iconFor, ResolveAction } from "./alert-bell-item";

/** An alert resolved in the last 7 days, worded like an open one. */
export type ResolvedRowData = { id: string; kind: string; severity: "info" | "warning" | "critical"; message: string; when: string; serviceCheck: boolean };
export type AlertBellData = { rows: AlertRowData[]; resolved: ResolvedRowData[]; services: ServiceProblem[]; overdue: OverdueData | null };

// Admin alerts store critical, warning and info; the bell names them Critical, High and Medium (owner, 2026-11-17).
const LEVEL: Record<AlertRowData["severity"], AlertSeverity> = { critical: "critical", warning: "high", info: "medium" };
const SERVICE_LEVEL: Record<ServiceProblem["state"], AlertSeverity> = { error: "critical", not_configured: "high", unknown: "high" };
const SERVICE_TITLE: Record<ServiceProblem["state"], string> = { error: "not working", not_configured: "not set up", unknown: "could not be checked" };
const SYSTEM_STATUS = { label: "Open System status", href: "/internal/admin/settings" };

/** A System status alert names its service ("Google Places not working"), not just "Service check" (2026-11-17). */
function titleOf(a: { kind: string; serviceCheck: boolean; message: string }): string {
  const service = a.serviceCheck ? /^(.+?) is not working\./.exec(a.message)?.[1] : undefined;
  return service ? `${service} not working` : alertKindLabel(a.kind, a.serviceCheck);
}

/**
 * A System status alert's text without what the title and link already say: "Perplexity is not working." under the
 * title "Perplexity not working", and "Found by the System status check." above "Open System status" (2026-11-18).
 */
export function bellText(a: { serviceCheck: boolean; message: string }): string {
  if (!a.serviceCheck) return a.message;
  const text = a.message.replace(/^.+? is not working\.\s*/, "").replace(/\s*Found by the System status check\.\s*$/, "").trim();
  return text || a.message;
}

/** Every open alert, the overdue scans, the services System status shows as broken, and what was resolved lately. */
function bellAlerts(data: AlertBellData): BellAlert[] {
  const overdue: BellAlert[] = data.overdue
    ? [
        {
          id: "overdue-scans",
          severity: "high",
          icon: CalendarClock,
          title: "Scheduled scans overdue",
          text: `${data.overdue.count === 1 ? "1 business has" : `${data.overdue.count} businesses have`} not been scanned for more than a day after its scheduled date. Check the scan worker and the agency's credits.`,
          link: data.overdue.businesses[0] ? { label: `Open ${data.overdue.businesses[0].name}`, href: `/internal/admin/businesses/${data.overdue.businesses[0].id}` } : undefined,
        },
      ]
    : [];
  const open = data.rows.map(
    (a): BellAlert => ({ id: a.id, severity: LEVEL[a.severity], icon: iconFor(a.kind), title: titleOf(a), when: a.when, text: bellText(a), link: a.links[0] }),
  );
  // Services System status shows as broken or not set up: no Resolve, they clear once the service works.
  const services = data.services.map(
    (s): BellAlert => ({ id: `service:${s.id}`, severity: SERVICE_LEVEL[s.state], icon: iconFor(`service_check:${s.id}`), title: `${s.name} ${SERVICE_TITLE[s.state]}`, text: s.detail, link: SYSTEM_STATUS }),
  );
  const resolved = data.resolved.map(
    (a): BellAlert => ({ id: `resolved:${a.id}`, severity: LEVEL[a.severity], icon: iconFor(a.kind), title: titleOf(a), when: a.when, text: bellText(a), resolved: true }),
  );
  return [...overdue, ...open, ...services, ...resolved];
}

/** The admin header's alert bell: the shared alert box, with Resolve on each open alert. */
export function AlertBell({ data, resolve }: { data: AlertBellData; resolve: Resolve }) {
  const resolvable = new Set(data.rows.map((r) => r.id));
  return (
    <AlertCenter
      alerts={bellAlerts(data)}
      storageKey="admin:read-alerts"
      statuses={["new", "seen", "resolved"]}
      headerLink={{ href: "/internal/admin/settings", label: "System status", icon: Settings }}
      footer="Checked every 15 minutes. Resolved stay 7 days."
      emptyText="No alerts. Nothing needs a look right now."
      actions={(a) => (resolvable.has(a.id) ? <ResolveAction alertId={a.id} run={resolve} /> : null)}
    />
  );
}
