import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { adminEmails, requireAdmin } from "@/modules/auth";
import { createLogEmailClient, sendEmail } from "@/modules/email";
import type { Database } from "@/types/database.types";
import type { NotifyDeps, OpenAlert } from "./service";

// system_alerts has RLS with no policies, so every read and write here uses the service role (B-69).
type Db = SupabaseClient<Database>;

const OPEN_ALERT_COLUMNS = "id, kind, severity, message, created_at, last_seen_at";

type AlertRow = { id: string; kind: string; severity: string; message: string; created_at: string; last_seen_at: string };

function toOpenAlert(r: AlertRow): OpenAlert {
  const severity = r.severity === "critical" || r.severity === "info" ? r.severity : "warning";
  return { id: r.id, kind: r.kind, severity, message: r.message, createdAt: r.created_at, lastSeenAt: r.last_seen_at };
}

/** Open alerts for the admin Overview, most serious first. */
export async function listOpenAlerts(db: Db = createServiceClient()): Promise<OpenAlert[]> {
  await requireAdmin();
  const { data, error } = await db
    .from("system_alerts")
    .select(OPEN_ALERT_COLUMNS)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Could not load open alerts: ${error.message}`);
  const rank = { critical: 0, warning: 1, info: 2 };
  return data.map(toOpenAlert).sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/** Marks an open alert resolved. Null when it does not exist or was already resolved. */
export async function markAlertResolved(alertId: string): Promise<{ kind: string; message: string } | null> {
  await requireAdmin();
  const { data, error } = await createServiceClient()
    .from("system_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", alertId)
    .is("resolved_at", null)
    .select("kind, message")
    .maybeSingle();
  if (error) throw new Error(`Could not resolve the alert: ${error.message}`);
  return data;
}

// The functions below run from the pg_cron call (no signed-in user); the route checks the worker secret first.

export function isAlertSecret(header: string | null): boolean {
  const secret = env.WORKER_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Runs every check in check_system_alerts(), with the daily cost check when ALERT_DAILY_COST_USD is set. */
export async function runAlertChecks(db: Db = createServiceClient()): Promise<string[]> {
  const { data, error } = await db.rpc("check_system_alerts", { p_daily_cost_limit_usd: env.ALERT_DAILY_COST_USD });
  if (error) throw new Error(`check_system_alerts failed: ${error.message}`);
  return data ?? [];
}

/** Live notify dependencies. Outside production emails are logged, never sent (.env.local may hold a real key). */
export function createNotifyDeps(db: Db = createServiceClient(), overrides: Partial<NotifyDeps> = {}): NotifyDeps {
  const client = env.NODE_ENV === "production" ? undefined : createLogEmailClient();
  return {
    async unemailed() {
      const { data, error } = await db
        .from("system_alerts")
        .select(OPEN_ALERT_COLUMNS)
        .is("resolved_at", null)
        .is("emailed_at", null)
        .order("created_at");
      if (error) throw new Error(`Could not load alerts to email: ${error.message}`);
      return data.map(toOpenAlert);
    },

    async emailedSince(kind, since) {
      const { count, error } = await db
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("type", "system_alert")
        .eq("status", "sent")
        .like("idempotency_key", `system_alert:${kind}:%`)
        .gt("sent_at", since.toISOString());
      if (error) throw new Error(`email_log lookup failed: ${error.message}`);
      return (count ?? 0) > 0;
    },

    async markEmailed(alertId, at) {
      const { error } = await db.from("system_alerts").update({ emailed_at: at.toISOString() }).eq("id", alertId);
      if (error) throw new Error(`Could not mark the alert emailed: ${error.message}`);
    },

    send: (input) => sendEmail(input, client ? { client } : {}),
    recipients: adminEmails(),
    now: () => new Date(),
    ...overrides,
  };
}
