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

const list = (names: string[]) => names.join(", ");

/** Whether pg_cron's jobs exist and their last runs went through. */
export function schedulesStatus(jobs: CronJob[], now: Date): ProbeResult {
  if (jobs.length === 0) return { state: "not_configured", detail: "No scheduled jobs found. Apply the migrations from 029 on." };
  const failed = jobs.filter((j) => j.lastStatus === "failed").map((j) => j.name);
  if (failed.length > 0) return { state: "error", detail: `Failed on the last run: ${list(failed)}.` };
  const paused = jobs.filter((j) => !j.active).map((j) => j.name);
  if (paused.length > 0) return { state: "error", detail: `Turned off: ${list(paused)}.` };
  const runs = jobs.map((j) => j.lastRunAt).filter((t): t is string => t !== null).sort();
  const last = runs.at(-1);
  const count = `${jobs.length} jobs scheduled`;
  return { state: "ok", detail: last ? `${count}. Last run ${timeAgo(new Date(last), now)}.` : `${count}. None has run yet.` };
}

/** The Vault settings the jobs call out with, and whether scheduled scans cover real accounts yet. */
export function jobSettingsStatus(s: JobSettings): ProbeResult {
  if (!s.workerUrlSet || !s.workerSecretSet) {
    return {
      state: "error",
      detail:
        "Scheduled and retried scans can't start: scan_worker_url and scan_worker_secret aren't set in Vault. See the worker section of the migrations README.",
    };
  }
  if (!s.scheduledScansIncludeReal) {
    return {
      state: "not_configured",
      detail: "Weekly and daily scans run for test accounts only. Turn them on for everyone with the go-live switch in the migrations README.",
    };
  }
  const missing = [!s.alertsUrlSet && "system_alerts_url", !s.emailJobsUrlSet && "email_jobs_url"].filter((m): m is string => !!m);
  if (missing.length > 0) {
    return { state: "not_configured", detail: `Scans run on schedule. Not set in Vault, so those emails don't go out: ${list(missing)}.` };
  }
  return { state: "ok", detail: "Scans run on schedule for every account, and alert and email jobs can reach the app." };
}
