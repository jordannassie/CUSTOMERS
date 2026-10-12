import "server-only";
import { requireAdmin } from "@/modules/auth";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { jobSettingsStatus, schedulesStatus, type CronJob } from "./schedules";
import type { ServiceStatus, SystemStatus } from "./schema";
import { PROBES, WORKER_OVERDUE_MINUTES, runProbe, stripeMode, workerStatus, type ProbeDeps } from "./service";

const KEYS: Record<string, string | undefined> = {
  openai: env.OPENAI_API_KEY,
  anthropic: env.ANTHROPIC_API_KEY,
  perplexity: env.PERPLEXITY_API_KEY,
  google_places: env.GOOGLE_PLACES_API_KEY,
  firecrawl: env.FIRECRAWL_API_KEY,
  browserless: env.BROWSERLESS_API_KEY,
  resend: env.RESEND_API_KEY,
  stripe: env.STRIPE_SECRET_KEY,
};

/** Checks every service live on each call (B-68); nothing here is cached. */
export async function getSystemStatus(deps: ProbeDeps = {}): Promise<SystemStatus> {
  await requireAdmin();
  const now = new Date();

  const [probes, worker, jobs] = await Promise.all([
    Promise.all(
      PROBES.map(async (probe): Promise<ServiceStatus> => {
        const key = KEYS[probe.id];
        const result = await runProbe(probe, key, { browserlessUrl: env.BROWSERLESS_URL, ...deps });
        const mode = probe.id === "stripe" ? stripeMode(key) : undefined;
        return { id: probe.id, name: probe.name, group: probe.group, ...result, ...(mode && { mode }) };
      }),
    ),
    checkWorker(now),
    checkSchedules(now),
  ]);

  return { checkedAt: now.toISOString(), services: [...probes, worker, ...jobs] };
}

/** pg_cron's jobs and their last runs, and the Vault settings they need (BUG-108). Never reads a secret's value. */
async function checkSchedules(now: Date): Promise<ServiceStatus[]> {
  const schedules = { id: "schedules", name: "Scheduled jobs (pg_cron)", group: "jobs" } as const;
  const settings = { id: "job_settings", name: "Scan worker settings", group: "jobs" } as const;
  const svc = createServiceClient();
  const [cron, vault] = await Promise.all([svc.rpc("cron_job_status"), svc.rpc("job_settings_status").maybeSingle()]);

  const jobs: CronJob[] = (cron.data ?? []).map((j) => ({
    name: j.job_name,
    active: j.active,
    lastRunAt: j.last_run_at,
    lastStatus: j.last_status,
  }));
  return [
    cron.error
      ? { ...schedules, state: "unknown", detail: "Could not read the schedules from the database." }
      : { ...schedules, ...schedulesStatus(jobs, now) },
    vault.error || !vault.data
      ? { ...settings, state: "unknown", detail: "Could not read the worker settings from the database." }
      : {
          ...settings,
          ...jobSettingsStatus({
            workerUrlSet: vault.data.worker_url_set,
            workerSecretSet: vault.data.worker_secret_set,
            alertsUrlSet: vault.data.alerts_url_set,
            emailJobsUrlSet: vault.data.email_jobs_url_set,
            scheduledScansIncludeReal: vault.data.scheduled_scans_include_real,
          }),
        },
  ];
}

async function checkWorker(now: Date): Promise<ServiceStatus> {
  const base = { id: "worker", name: "Scan worker", group: "jobs" } as const;
  const overdueBefore = new Date(now.getTime() - WORKER_OVERDUE_MINUTES * 60_000).toISOString();
  const svc = createServiceClient();

  const [last, overdue] = await Promise.all([
    svc
      .from("scan_jobs")
      .select("finished_at")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    svc
      .from("scan_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .lt("run_after", overdueBefore),
  ]);

  if (last.error || overdue.error) {
    return { ...base, state: "unknown", detail: "Could not read the scan queue from the database." };
  }
  return {
    ...base,
    ...workerStatus({ lastFinishedAt: last.data?.finished_at ?? null, overdueJobs: overdue.count ?? 0 }, now),
  };
}
