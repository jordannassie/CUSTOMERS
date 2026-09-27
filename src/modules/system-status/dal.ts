import "server-only";
import { requireAdmin } from "@/modules/auth";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
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

  const [probes, worker] = await Promise.all([
    Promise.all(
      PROBES.map(async (probe): Promise<ServiceStatus> => {
        const key = KEYS[probe.id];
        const result = await runProbe(probe, key, deps);
        const mode = probe.id === "stripe" ? stripeMode(key) : undefined;
        return { id: probe.id, name: probe.name, group: probe.group, ...result, ...(mode && { mode }) };
      }),
    ),
    checkWorker(now),
  ]);

  return {
    checkedAt: now.toISOString(),
    services: [
      ...probes,
      worker,
      {
        id: "schedules",
        name: "Scheduled jobs (pg_cron)",
        group: "jobs",
        state: "unknown",
        detail: "The schedules are not set up yet, so there is no last run to show.",
      },
    ],
  };
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
