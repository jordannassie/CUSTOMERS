import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { grantCredits } from "@/modules/credits";
import { queueSkippedScans } from "./dal";
import { createTestAgency, deleteTestUsers, service } from "./jobs.test-helpers";
import { balanceOf, business, days, jobsOf, runLikeWorker, runningJob, type Agency } from "./scan-safety.test-helpers";

// H1 next scan date, M1 off-plan businesses, M3 scans skipped for lack of credits (migration 069).
// Test agencies only, with recorded answers: no AI calls (D-61).
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...env, WORKER_SECRET: "x", WORKER_TIME_BUDGET_SECONDS: 60 } };
});
afterAll(deleteTestUsers);

const HOUR = 3_600_000;
const nextScanOf = async (id: string) =>
  (await service.from("businesses").select("next_scan_at").eq("id", id).single().throwOnError()).data.next_scan_at;
/** The first 02:00 UTC run after now, like next_scheduled_scan_run. */
function nextRun(): number {
  const now = new Date();
  const run = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2);
  return run > now.getTime() ? run : run + 24 * HOUR;
}
const topUp = (agency: Agency, amount: number) =>
  grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount, expiresAt: null });
const planItem = (agency: Agency, businessId: string, status: string) =>
  service.from("business_subscriptions").insert({ business_id: businessId, agency_id: agency.agencyId, plan_id: "starter", status }).throwOnError();

describe("H1: a finished scan's next scan", () => {
  it("lands on a 02:00 UTC run at least 20 hours later", async () => {
    const agency = await createTestAgency(100);
    const id = await business(agency, { scan_frequency: "daily", next_scan_at: null });
    const { outcome } = await runLikeWorker(await runningJob(agency, id));
    expect(outcome.status).toBe("done");
    const next = new Date((await nextScanOf(id))!);
    expect(next.getUTCHours()).toBe(2);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getTime() - Date.now()).toBeGreaterThanOrEqual(20 * HOUR - 60_000);
  });
});

describe("M1: a business off the plan", () => {
  it("is skipped by the worker with a reason, holding and charging nothing", async () => {
    const agency = await createTestAgency(100);
    const id = await business(agency);
    await planItem(agency, id, "canceled");
    const job = await runningJob(agency, id);

    const { outcome, update } = await runLikeWorker(job);
    expect(outcome).toEqual({ status: "skipped", reason: "This business is off your plan." });
    expect(update).toEqual({ status: "skipped", error: "This business is off your plan." });
    expect(await balanceOf(agency.agencyId)).toBe(100);
    expect((await service.from("scan_jobs").select("hold_id").eq("id", job.id).single().throwOnError()).data.hold_id).toBeNull();
  });

  it("still scans a business on a trial item, and a test agency's business with no plan item", async () => {
    const agency = await createTestAgency(100);
    const trial = await business(agency);
    await planItem(agency, trial, "trialing");
    const noItem = await business(agency);
    for (const id of [trial, noItem]) {
      expect((await runLikeWorker(await runningJob(agency, id))).outcome.status).toBe("done");
    }
  });
});

describe("M3: a scan skipped for lack of credits", () => {
  it("is tried again at the next 02:00 run, not a week later", async () => {
    const agency = await createTestAgency(0);
    const id = await business(agency, { scan_frequency: "weekly", next_scan_at: days(-1) });
    const { update } = await runLikeWorker(await runningJob(agency, id));
    expect(update).toEqual({ status: "skipped", error: "You're out of credits. Buy a top-up or upgrade." });
    expect(new Date((await nextScanOf(id))!).getTime()).toBe(nextRun());
  });

  it("never brings a later scheduled scan closer", async () => {
    const agency = await createTestAgency(0);
    const later = new Date(nextRun() + 3 * 24 * HOUR).toISOString();
    const id = await business(agency, { next_scan_at: later });
    await runLikeWorker(await runningJob(agency, id));
    expect(new Date((await nextScanOf(id))!).getTime()).toBe(new Date(later).getTime());
  });

  it("is queued again at once by queueSkippedScans after a top-up, once", async () => {
    const agency = await createTestAgency(0);
    const skipped = await business(agency, { next_scan_at: days(-1) });
    await runLikeWorker(await runningJob(agency, skipped));
    // Left out of the nightly run at 0 credits: due, with no job.
    const missed = await business(agency, { next_scan_at: days(-2) });
    // Not due yet, and one scanned in the last 20 hours: neither is queued.
    const notDue = await business(agency, { next_scan_at: days(5) });
    const recent = await business(agency, { next_scan_at: days(-1) });
    await service
      .from("scan_jobs")
      .insert({ agency_id: agency.agencyId, business_id: recent, status: "done", attempts: 1, finished_at: new Date(Date.now() - 2 * HOUR).toISOString() })
      .throwOnError();

    expect(await queueSkippedScans(agency.agencyId)).toBe(0);
    await topUp(agency, 50);
    expect(await queueSkippedScans(agency.agencyId)).toBe(2);
    for (const id of [skipped, missed]) expect((await jobsOf(id)).filter((j) => j.status === "queued")).toHaveLength(1);
    for (const id of [notDue, recent]) expect((await jobsOf(id)).filter((j) => j.status === "queued")).toEqual([]);
    // The open jobs stop a second top-up from queueing them twice.
    expect(await queueSkippedScans(agency.agencyId)).toBe(0);
  });

  it("queues nothing for a past due agency or a business off the plan", async () => {
    const agency = await createTestAgency(50);
    const offPlan = await business(agency, { next_scan_at: days(-1) });
    await planItem(agency, offPlan, "canceled");
    expect(await queueSkippedScans(agency.agencyId)).toBe(0);
    await business(agency, { next_scan_at: days(-1) });
    await service.from("agencies").update({ status: "past_due" }).eq("id", agency.agencyId).throwOnError();
    expect(await queueSkippedScans(agency.agencyId)).toBe(0);
  });
});
