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
    expect(schedulesStatus([job("a", { lastStatus: "failed" }), job("b")], now)).toEqual({ state: "error", detail: "Failed on the last run: a." });
    expect(schedulesStatus([job("a", { active: false })], now)).toEqual({ state: "error", detail: "Turned off: a." });
  });

  it("says so when there are no jobs", () => {
    expect(schedulesStatus([], now).state).toBe("not_configured");
  });
});

describe("jobSettingsStatus", () => {
  it("is an error when the worker URL or secret is missing, since queued scans then never start", () => {
    expect(jobSettingsStatus({ ...settings, workerSecretSet: false })).toMatchObject({ state: "error" });
    expect(jobSettingsStatus({ ...settings, workerUrlSet: false }).detail).toContain("scan_worker_url and scan_worker_secret");
  });

  it("says scheduled scans cover test accounts only before the go-live switch", () => {
    expect(jobSettingsStatus({ ...settings, scheduledScansIncludeReal: false })).toMatchObject({ state: "not_configured" });
  });

  it("names a missing alerts or email jobs URL", () => {
    expect(jobSettingsStatus({ ...settings, emailJobsUrlSet: false }).detail).toContain("email_jobs_url");
  });

  it("is ok when everything is set", () => {
    expect(jobSettingsStatus(settings).state).toBe("ok");
  });
});
