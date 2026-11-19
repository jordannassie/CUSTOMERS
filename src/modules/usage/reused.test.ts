import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { loadUsageReport } from "./dal";

// H1: the scan history says how many of a scan's answers were reused from the shared cache. Local test database.
const service = createServiceClient();
const userIds: string[] = [];
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function seed() {
  const { data: user, error } = await service.auth.admin.createUser({ email: `vitest-reused-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Reused test", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: "Joe's Plumbing", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  return { agencyId: agency.id as string, businessId: business.id as string };
}

/** A finished scan job whose run saved one check per entry of `cached`. */
async function scan(agencyId: string, businessId: string, cached: boolean[]) {
  const { data: job } = await service
    .from("scan_jobs")
    .insert({ agency_id: agencyId, business_id: businessId, status: "done", attempts: 1, finished_at: new Date().toISOString() })
    .select("id")
    .single()
    .throwOnError();
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "openai", scan_job_id: job.id, status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("visibility_results")
    .insert(cached.map((c) => ({ run_id: run.id, business_id: businessId, provider: "openai", cached: c })))
    .throwOnError();
  return job.id as string;
}

describe("scan history reused answers (H1)", () => {
  it("counts each scan's checks answered from the cache", async () => {
    const { agencyId, businessId } = await seed();
    const fresh = await scan(agencyId, businessId, [false, false, false]);
    const rescan = await scan(agencyId, businessId, [true, true, false]);

    const report = await loadUsageReport(agencyId, new Date());
    const byId = new Map(report.scans.map((s) => [s.id, s.reused]));
    expect(byId.get(fresh)).toBe(0);
    expect(byId.get(rescan)).toBe(2);
  });
});
