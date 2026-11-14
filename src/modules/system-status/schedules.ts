import { timeAgo, type ProbeResult } from "./service";

// Scheduled jobs and the settings they need, for the admin status page (BUG-108). Pure, so every case is tested.

export type CronJob = { name: string; active: boolean; lastRunAt: string | null; lastStatus: string | null };

export type JobSettings = {
  workerUrlSet: boolean;
  workerSecretSet: boolean;
  alertsUrlSet: boolean;
  emailJobsUrlSet: boolean;
  scheduledScansIncludeReal: boolean;
};

// What each scheduled job does, in plain words, so a failed or paused one reads as a task, not a code name.
const JOB_LABELS: Record<string, string> = {
  "call-scan-worker": "starting queued scans",
  "enqueue-due-scans": "queueing scheduled scans",
  "reset-stuck-jobs": "restarting stuck scans",
  "release-orphan-holds": "releasing unused credit holds",
  "expire-grants": "expiring old credits",
  "check-system-alerts": "checking for problems",
  "email-low-credits": "low credit emails",
  "email-weekly-report": "weekly report emails",
  "email-price-changes": "price change emails",
  "purge-cron-history": "clearing old job history",
  "purge-deleted-accounts": "removing deleted accounts",
  "purge-rate-limit-hits": "clearing old rate limit records",
};

const list = (names: string[]) => names.map((n) => JOB_LABELS[n] ?? n.replace(/[-_]+/g, " ")).join(", ");

/** Whether the scheduled jobs exist and their last runs went through. */
export function schedulesStatus(jobs: CronJob[], now: Date): ProbeResult {
  if (jobs.length === 0) {
    return {
      state: "not_configured",
      detail: "No scheduled jobs found, so nothing runs by itself (scheduled scans, credit expiry, emails).",
      fix: "Apply the database migrations from 029 on.",
    };
  }
  const failed = jobs.filter((j) => j.lastStatus === "failed").map((j) => j.name);
  if (failed.length > 0) {
    return { state: "error", detail: `These jobs failed the last time they ran: ${list(failed)}.`, fix: "Check the job history in Supabase (cron.job_run_details)." };
  }
  const paused = jobs.filter((j) => !j.active).map((j) => j.name);
  if (paused.length > 0) return { state: "error", detail: `These jobs are switched off: ${list(paused)}.`, fix: "Switch them back on in Supabase (cron.job)." };
  const runs = jobs.map((j) => j.lastRunAt).filter((t): t is string => t !== null).sort();
  const last = runs.at(-1);
  const count = `${jobs.length} jobs scheduled`;
  return { state: "ok", detail: last ? `${count}. Last run ${timeAgo(new Date(last), now)}.` : `${count}. None has run yet.` };
}

/** The settings the jobs need to reach the app, and whether scheduled scans cover real accounts yet. */
export function jobSettingsStatus(s: JobSettings): ProbeResult {
  if (!s.workerUrlSet || !s.workerSecretSet) {
    return {
      state: "error",
      detail: "Scheduled scans and retries can't start, because the database doesn't know where the scan worker is. Scans started with Run scan still work.",
      fix: "A developer needs to set scan_worker_url and scan_worker_secret in Supabase Vault.",
    };
  }
  if (!s.scheduledScansIncludeReal) {
    return {
      state: "off",
      detail: "Daily and weekly scans run by themselves for test accounts only. Customers' scheduled scans start at launch. Scans started with Run scan work for everyone.",
      fix: "Off on purpose until launch. A developer turns them on at go-live.",
    };
  }
  const missing = [!s.alertsUrlSet && "problem alerts", !s.emailJobsUrlSet && "scheduled emails"].filter((m): m is string => !!m);
  const vault = [!s.alertsUrlSet && "system_alerts_url", !s.emailJobsUrlSet && "email_jobs_url"].filter((m): m is string => !!m);
  if (missing.length > 0) {
    return {
      state: "not_configured",
      detail: `Scans run on schedule, but ${missing.join(" and ")} can't reach the app, so they don't go out.`,
      fix: `A developer needs to set ${vault.join(" and ")} in Supabase Vault.`,
    };
  }
  return { state: "ok", detail: "Scans run on schedule for every account, and alert and email jobs can reach the app." };
}
