import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { agencyFixesState, loadFixesState, markExplained } from "./dal";

// "Working out your fixes" against the local database (migration 061).
const db = createServiceClient();
const userIds: string[] = [];

async function business() {
  const { data, error } = await db.auth.admin.createUser({ email: `vitest-fixes-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await db.from("agencies").insert({ owner_user_id: data.user.id, name: "Fixes state test", is_test: true }).select("id").single().throwOnError();
  const { data: b } = await db.from("businesses").insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Car Workshop", status: "active" }).select("id").single().throwOnError();
  return { agencyId: agency.id, businessId: b.id };
}
const run = async (businessId: string, status: string, completedAt: Date | null) =>
  (await db.from("visibility_runs").insert({ business_id: businessId, provider: "openai", status, completed_at: completedAt?.toISOString() ?? null }).select("id").single().throwOnError()).data.id;

afterAll(async () => {
  for (const id of userIds) await db.auth.admin.deleteUser(id);
});

describe("fixes state", () => {
  it("says 'never scanned', then 'working' after a scan, then done once the fixes are saved", async () => {
    const { agencyId, businessId } = await business();
    expect(await loadFixesState(businessId)).toEqual({ everScanned: false, pending: false });
    // A failed scan does not count as scanned.
    await run(businessId, "failed", null);
    expect(await loadFixesState(businessId)).toEqual({ everScanned: false, pending: false });

    const latest = await run(businessId, "completed", new Date());
    expect(await loadFixesState(businessId)).toEqual({ everScanned: true, pending: true });
    await markExplained(latest);
    expect(await loadFixesState(businessId)).toEqual({ everScanned: true, pending: false });

    // Only the agency's own business.
    const other = await business();
    expect(await agencyFixesState(other.agencyId, businessId)).toBeNull();
    expect(await agencyFixesState(agencyId, businessId)).toEqual({ everScanned: true, pending: false });
  });

  it("stops waiting on a scan whose fixes never came", async () => {
    const { businessId } = await business();
    await run(businessId, "completed", new Date(Date.now() - 30 * 60_000));
    expect(await loadFixesState(businessId)).toEqual({ everScanned: true, pending: false });
  });
});
