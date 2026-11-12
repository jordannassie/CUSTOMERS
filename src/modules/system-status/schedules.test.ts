import { describe, expect, it } from "vitest";
import { jobSettingsStatus, schedulesStatus } from "./schedules";

// BUG-108: the status page said scheduled jobs were "not set up" while they ran, and never said the worker settings
// were missing.
const now = new Date("2026-10-09T12:00:00Z");
const job = (name: string, over: Partial<{ active: boolean; lastRunAt: string | null; lastStatus: string | null }> = {}) => ({
  name,
  active: true,
  lastRunAt: "2026-10-09T11:58:00Z",
  lastStatus: "succeeded",
  ...over,
});
const settings = { workerUrlSet: true, workerSecretSet: true, alertsUrlSet: true, emailJobsUrlSet: true, scheduledScansIncludeReal: true };

describe("schedulesStatus", () => {
  it("is ok with the job count and the latest run", () => {
    expect(schedulesStatus([job("call-scan-worker"), job("expire-grants", { lastRunAt: null, lastStatus: null })], now)).toEqual({
      state: "ok",
      detail: "2 jobs scheduled. Last run 2 min ago.",
    });
  });

  it("names jobs whose last run failed, or that are turned off", () => {
    expect(schedulesStatus([job("call-scan-worker", { lastStatus: "failed" }), job("b")], now)).toMatchObject({
      state: "error",
      detail: "These jobs failed the last time they ran: starting queued scans.",
    });
    expect(schedulesStatus([job("expire-grants", { active: false })], now)).toMatchObject({
      state: "error",
      detail: "These jobs are switched off: expiring old credits.",
    });
  });

  it("names an unknown job in words, never as a code name", () => {
    expect(schedulesStatus([job("tidy-up_old-things", { active: false })], now).detail).toBe("These jobs are switched off: tidy up old things.");
  });

  it("says so when there are no jobs", () => {
    expect(schedulesStatus([], now).state).toBe("not_configured");
  });
});

describe("jobSettingsStatus", () => {
  it("is an error when the worker URL or secret is missing, since queued scans then never start", () => {
    expect(jobSettingsStatus({ ...settings, workerSecretSet: false })).toMatchObject({ state: "error" });
    const missing = jobSettingsStatus({ ...settings, workerUrlSet: false });
    expect(missing.detail).toContain("Scans started with Run scan still work");
    // The setting names are for whoever fixes it, never in the sentence the admin reads first.
    expect(missing.detail).not.toContain("scan_worker");
    expect(missing.fix).toContain("scan_worker_url and scan_worker_secret");
  });

  it("says scheduled scans cover test accounts only before the go-live switch", () => {
    // Off on purpose before launch: not "Not set up", which read as broken while scans worked.
    expect(jobSettingsStatus({ ...settings, scheduledScansIncludeReal: false })).toMatchObject({ state: "off" });
    expect(jobSettingsStatus({ ...settings, scheduledScansIncludeReal: false }).fix).toContain("go-live switch");
  });

  it("names a missing alerts or email jobs URL", () => {
    const result = jobSettingsStatus({ ...settings, emailJobsUrlSet: false });
    expect(result.detail).toBe("Scans run on schedule, but scheduled emails can't reach the app, so they don't go out.");
    expect(result.fix).toContain("email_jobs_url");
  });

  it("is ok when everything is set", () => {
    expect(jobSettingsStatus(settings).state).toBe("ok");
  });
});
