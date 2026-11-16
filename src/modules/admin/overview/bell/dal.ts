import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getSavedSystemStatus } from "@/modules/system-status";
import { stripeDashboardPage } from "../../agencies/detail/recent/dal";
import { listOpenAlerts } from "../../alerts/dal";
import { alertLinks, serviceCheckKind, type AlertLink, type OpenAlert } from "../../alerts/service";
import { loadOverdueScans, type OverdueScans } from "../sources/dal";

/** A service System status shows as not working or not set up, with no open alert of its own (an alert is only
 * raised for "not working"; "not set up" closes it, yet Resend unset still fails every email). */
export type ServiceProblem = { id: string; name: string; state: "error" | "not_configured" | "unknown"; detail: string };

export type AlertBell = { openAlerts: (OpenAlert & { links: AlertLink[] })[]; overdueScans: OverdueScans | null; services: ServiceProblem[] };

// The bell reads System status's last saved check, never a new one: that check calls every provider.
const SAVED_CHECK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PROBLEM_STATES = new Set(["error", "not_configured", "unknown"]);

/**
 * What the admin header's alert bell shows on every admin page (owner, 2026-11-16: it replaced the Overview's yellow
 * bar): the open alerts, the real customers' overdue scheduled scans (as on the Overview without test agencies), and
 * every service System status shows as not working or not set up that has no alert open for it.
 */
export async function loadAlertBell(): Promise<AlertBell> {
  await requireAdmin();
  const db = createServiceClient();
  const [alerts, overdueScans, status] = await Promise.all([
    listOpenAlerts(db),
    loadOverdueScans(db, new Date(), [false]),
    getSavedSystemStatus(SAVED_CHECK_MAX_AGE_MS).catch(() => null),
  ]);
  const alerted = new Set(alerts.map((a) => a.kind));
  const services = (status?.services ?? [])
    .filter((s) => PROBLEM_STATES.has(s.state) && !alerted.has(serviceCheckKind(s.id)))
    .map((s) => ({ id: s.id, name: s.name, state: s.state as ServiceProblem["state"], detail: s.detail }));
  return { openAlerts: alerts.map((a) => ({ ...a, links: alertLinks(a.kind, stripeDashboardPage("webhooks")) })), overdueScans, services };
}
