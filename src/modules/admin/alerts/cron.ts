import "server-only";
import { createNotifyDeps, isAlertSecret, runAlertChecks } from "./dal";
import { notifyAdmins, type NotifyDeps } from "./service";

/**
 * pg_cron calls this through pg_net every 15 minutes (run_system_alerts, migration 037), after it has run the
 * database checks itself. This adds the daily AI cost check, whose limit is an app env var, then emails the admins.
 */
export async function handleAlertsRequest(req: Request, deps?: NotifyDeps): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!isAlertSecret(req.headers.get("x-worker-secret"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const opened = await runAlertChecks();
  const emails = await notifyAdmins(deps ?? createNotifyDeps());
  return Response.json({ opened: opened.length, ...emails });
}
