import "server-only";
import { requestNow } from "@/lib/request-now";
import { alertWording, isServiceCheckKind, loadAlertBell } from "@/modules/admin";
import type { AlertBellData } from "./alert-bell";
import { formatDate } from "./format";

const TIME = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "12:30" when it was today (UTC), else "Nov 14". */
export function shortWhen(iso: string, now: Date): string {
  const at = new Date(iso);
  return at.toISOString().slice(0, 10) === now.toISOString().slice(0, 10) ? TIME.format(at) : DAY.format(at);
}

/** The alert bell's rows with their dates and wording ready (the date helper lives beside server-only code). */
export async function alertBellData(): Promise<AlertBellData> {
  const bell = await loadAlertBell();
  const now = requestNow();
  return {
    rows: bell.openAlerts.map((a) => ({
      ...a,
      ...alertWording(a, now),
      started: formatDate(a.createdAt, true),
      lastSeen: formatDate(a.lastSeenAt, true),
      when: shortWhen(a.lastSeenAt, now),
      serviceCheck: isServiceCheckKind(a.kind),
    })),
    resolved: bell.resolvedAlerts.map((a) => ({
      id: a.id,
      kind: a.kind,
      severity: a.severity,
      message: alertWording(a, now).message,
      when: shortWhen(a.resolvedAt, now),
      serviceCheck: isServiceCheckKind(a.kind),
    })),
    services: bell.services,
    overdue: bell.overdueScans
      ? { count: bell.overdueScans.count, businesses: bell.overdueScans.businesses.map((b) => ({ ...b, due: formatDate(b.dueAt) })) }
      : null,
  };
}
