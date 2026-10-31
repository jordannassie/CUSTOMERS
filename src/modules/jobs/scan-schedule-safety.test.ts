import { afterAll, describe, expect, it, vi } from "vitest";
import { finishJob, retryFailedJob } from "./dal";
import { createTestAgency, deleteTestUsers, readJob, service } from "./jobs.test-helpers";
import { balanceOf, business, DAY, days, jobsOf, runLikeWorker, runningJob } from "./scan-safety.test-helpers";

// Fix list Step 2 (migration 050): A6 deleted or off-plan businesses, B5 skipped scans and the schedule.
// Test agencies only, with recorded answers: no AI calls (D-61).
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...env, WORKER_SECRET: "x", WORKER_TIME_BUDGET_SECONDS: 60 } };
});
afterAll(deleteTestUsers);

describe("A6: a deleted business or one off the plan is never scheduled", () => {
  it("enqueue_due_scans skips a deleted business and one taken off the plan", async () => {
    const agency = await createTestAgency(100);
    const due = await business(agency, { next_scan_at: days(-1) });
    const deleted = await business(agency, { next_scan_at: days(-1), deleted_at: new Date().toISOString() });
    const offPlan = await business(agency, { next_scan_at: days(-1) });
    await service.from("business_subscriptions").insert({ business_id: offPlan, agency_id: agency.agencyId, plan_id: "starter", status: "canceled" }).throwOnError();

    await service.rpc("enqueue_due_scans", { p_include_real: false }).throwOnError();
    expect(await jobsOf(due)).toHaveLength(1);
    for (const id of [deleted, offPlan]) expect(await jobsOf(id)).toEqual([]);
  });

  it("a scan that finishes after its business was deleted or taken off the plan does not put it back on the schedule", async () => {
    const agency = await createTestAgency(100);
    const deleted = await business(agency, { next_scan_at: null });
    const offPlan = await business(agency, { next_scan_at: null });
    const normal = await business(agency, { next_scan_at: null });
    await service.from("businesses").update({ deleted_at: new Date().toISOString() }).eq("id", deleted).throwOnError();
    await service.from("business_subscriptions").insert({ business_id: offPlan, agency_id: agency.agencyId, plan_id: "starter", status: "canceled" }).throwOnError();

    const set = async (id: string) => (await service.rpc("set_next_scan_at", { p_business_id: id, p_at: days(7) })).data;
    expect(await set(deleted)).toBe(false);
    expect(await set(offPlan)).toBe(false);
    expect(await set(normal)).toBe(true);
    const next = async (id: string) => (await service.from("businesses").select("next_scan_at").eq("id", id).single().throwOnError()).data.next_scan_at;
    expect(await next(deleted)).toBeNull();
    expect(await next(offPlan)).toBeNull();
    expect(await next(normal)).not.toBeNull();
  });

  it("a queued scan of a business deleted since is skipped with a reason, holds and charges nothing", async () => {
    const agency = await createTestAgency(100);
    const id = await business(agency);
    const job = await runningJob(agency, id);
    await service.from("businesses").update({ deleted_at: new Date().toISOString() }).eq("id", id).throwOnError();

    const { outcome, update } = await runLikeWorker(job);
    expect(outcome).toEqual({ status: "skipped", reason: "This business was deleted." });
    expect(update.status).toBe("skipped");
    expect(await balanceOf(agency.agencyId)).toBe(100);
    expect((await service.from("businesses").select("next_scan_at").eq("id", id).single().throwOnError()).data.next_scan_at).toBeNull();
  });

  it("admin Retry refuses a deleted business", async () => {
    const agency = await createTestAgency(100);
    const id = await business(agency);
    const job = await runningJob(agency, id);
    await finishJob(job, { status: "failed", error: "x" }, new Date());
    await service.from("businesses").update({ deleted_at: new Date().toISOString() }).eq("id", id).throwOnError();
    expect(await retryFailedJob(job.id)).toBe("business_deleted");
    expect(await readJob(job.id)).toMatchObject({ status: "failed" });
  });
});

describe("B5: skipped scans are not failures and the schedule moves on", () => {
  it.each([["daily", 1], ["weekly", 7], ["monthly", 30]])("a %s business with nothing to scan is skipped and due again in %i days", async (frequency, daysAhead) => {
    const agency = await createTestAgency(100);
    const id = await business(agency, { scan_frequency: frequency, next_scan_at: days(-1) }, 0);
    const job = await runningJob(agency, id);

    const { update } = await runLikeWorker(job);
    expect(update).toEqual({ status: "skipped", error: "This business has no active questions." });
    expect(await readJob(job.id)).toMatchObject({ status: "skipped", error: "This business has no active questions." });
    const { data } = await service.from("businesses").select("next_scan_at").eq("id", id).single().throwOnError();
    expect(Math.abs((new Date(data.next_scan_at!).getTime() - Date.now()) / DAY - daysAhead)).toBeLessThan(0.05);

    // Not queued again tonight.
    await service.rpc("enqueue_due_scans", { p_include_real: false }).throwOnError();
    expect((await jobsOf(id)).filter((j) => j.status === "queued")).toEqual([]);
  });

  it("alerts count a skipped scan as neither done nor failed", async () => {
    const agency = await createTestAgency(100);
    const skipped = await runningJob(agency, await business(agency, {}, 0));
    await runLikeWorker(skipped);
    const { data } = await service
      .from("scan_jobs")
      .select("status")
      .eq("id", skipped.id)
      .in("status", ["done", "failed"])
      .throwOnError();
    expect(data).toEqual([]);
  });

  it("a business whose first scan failed is scheduled for tomorrow, and a scheduled one keeps its due date", async () => {
    const agency = await createTestAgency(100);
    const first = await business(agency, { next_scan_at: null });
    const scheduled = await business(agency, { next_scan_at: days(-2) });
    for (const id of [first, scheduled]) {
      expect(await finishJob(await runningJob(agency, id, 3), { status: "failed", error: "Every check failed" }, new Date())).toBe(true);
    }
    const next = async (id: string) => (await service.from("businesses").select("next_scan_at").eq("id", id).single().throwOnError()).data.next_scan_at!;
    expect(Math.abs((new Date(await next(first)).getTime() - Date.now()) / DAY - 1)).toBeLessThan(0.05);
    expect(new Date(await next(scheduled)).getTime()).toBeLessThan(Date.now());
  });

  it("admin Retry works on a skipped scan too", async () => {
    const agency = await createTestAgency(100);
    const job = await runningJob(agency, await business(agency));
    await finishJob(job, { status: "skipped", error: "You're out of credits." }, new Date());
    expect(await retryFailedJob(job.id)).toBe("queued");
  });
});
