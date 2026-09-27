import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits, holdCredits, releaseHold } from "@/modules/credits";
import { retryFailedJob } from "./dal";

// retry_scan_job (migration 033) against the local database. No scan runs, so no AI calls.
const service = createServiceClient();
const userIds: string[] = [];
const LOW_PRIORITY = -1_000_000;

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function failedJobWithClosedHold() {
  const { data: user, error } = await service.auth.admin.createUser({ email: `vitest-retry-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Retry test", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  await grantCredits({ agencyId: agency.id, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 50, expiresAt: null });
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: "Bean There Coffee", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: job } = await service
    .from("scan_jobs")
    .insert({ agency_id: agency.id, business_id: business.id, priority: LOW_PRIORITY, status: "failed", attempts: 3, error: "x" })
    .select("id")
    .single()
    .throwOnError();
  const holdId = await holdCredits(agency.id, 3, job.id);
  await releaseHold(holdId);
  return { agencyId: agency.id, businessId: business.id, jobId: job.id, holdId };
}

describe("retry_scan_job", () => {
  it("leaves the job and its hold untouched when the business already has an active job", async () => {
    const f = await failedJobWithClosedHold();
    await service
      .from("scan_jobs")
      .insert({ agency_id: f.agencyId, business_id: f.businessId, priority: LOW_PRIORITY, status: "running" })
      .throwOnError();

    expect(await retryFailedJob(f.jobId)).toBe("business_busy");
    const { data: job } = await service.from("scan_jobs").select("status, hold_id").eq("id", f.jobId).single().throwOnError();
    expect(job).toEqual({ status: "failed", hold_id: f.holdId });
    const { data: hold } = await service.from("credit_holds").select("scan_job_id").eq("id", f.holdId).single().throwOnError();
    expect(hold.scan_job_id).toBe(f.jobId);

    expect(await retryFailedJob(randomUUID())).toBe("not_failed");
  });

  it("cannot be called by signed-in users or anon", async () => {
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error } = await anon.rpc("retry_scan_job", { p_job_id: randomUUID() });
    expect(error?.code).toBe("42501");
  });
});
