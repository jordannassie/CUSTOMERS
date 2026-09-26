import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";
import { loadAgencyFacts, loadBusinessFacts } from "./dal";
import { canAddBusiness, canSpendTopUps, canStartScan, maxQuestions, REASONS } from "./index";

// Runs against the local database `npm test` rebuilds.
const service = createServiceClient();
const userIds: string[] = [];
type Agency = { agencyId: string; businessIds: string[] };

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

async function createAgency(businesses: number): Promise<Agency> {
  const { data: user, error } = await service.auth.admin.createUser({
    email: `vitest-entitlements-${randomUUID()}@example.test`,
    email_confirm: true,
  });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const owner = user.user.id;

  const agency = await service
    .from("agencies")
    .insert({ owner_user_id: owner, name: "Entitlements test", is_test: true })
    .select("id")
    .single();
  if (agency.error) throw agency.error;
  const rows = Array.from({ length: businesses }, (_, i) => ({ owner_user_id: owner, agency_id: agency.data.id, name: `B${i}` }));
  const made = await service.from("businesses").insert(rows).select("id");
  if (made.error) throw made.error;
  return { agencyId: agency.data.id, businessIds: made.data.map((b) => b.id) };
}

function topup(agency: Agency, amount: number) {
  return grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount, expiresAt: null });
}

async function newScanJob(agency: Agency) {
  const { error } = await service.from("scan_jobs").insert({ agency_id: agency.agencyId, business_id: agency.businessIds[0] });
  if (error) throw error;
}

async function setStatus(agency: Agency, status: string) {
  const { error } = await service.from("agencies").update({ status }).eq("id", agency.agencyId);
  if (error) throw error;
}

describe("entitlements against the database", () => {
  it("loads the agency's status, business count and balance", async () => {
    const agency = await createAgency(2);
    await topup(agency, 40);
    expect(await loadAgencyFacts(agency.agencyId)).toEqual({
      id: agency.agencyId,
      status: "trialing",
      businessCount: 2,
      balance: 40,
    });
  });

  it("stops a trial agency at its third business", async () => {
    const agency = await createAgency(2);
    expect(await canAddBusiness(agency.agencyId)).toEqual({ allowed: false, reason: REASONS.trialBusinessLimit });
  });

  it("uses the business's plan limits, and Starter limits before it has a plan", async () => {
    const agency = await createAgency(1);
    const [businessId] = agency.businessIds;
    expect(await loadBusinessFacts(businessId)).toMatchObject({ planName: "Starter", maxQuestions: 25, maxCompetitors: 5 });

    const { error } = await service
      .from("business_subscriptions")
      .insert({ business_id: businessId, agency_id: agency.agencyId, plan_id: "pro" });
    if (error) throw error;
    expect(await loadBusinessFacts(businessId)).toMatchObject({ planName: "Pro", maxQuestions: 25, maxCompetitors: 10 });
  });

  it("counts only active questions against the limit", async () => {
    const agency = await createAgency(1);
    const [businessId] = agency.businessIds;
    const rows = Array.from({ length: 26 }, (_, i) => ({ business_id: businessId, prompt: `q${i}`, active: i < 25 }));
    const { error } = await service.from("tracked_prompts").insert(rows);
    if (error) throw error;
    expect(await maxQuestions(businessId)).toMatchObject({ allowed: false, limit: 25 });
  });

  it("allows a scan, then blocks a second while the first is queued", async () => {
    const agency = await createAgency(1);
    await topup(agency, 36);
    expect(await canStartScan(agency.agencyId, agency.businessIds[0])).toEqual({ allowed: true, reason: "" });
    await newScanJob(agency);
    expect((await canStartScan(agency.agencyId, agency.businessIds[0])).reason).toBe(REASONS.scanAlreadyQueued);
  });

  it("blocks a scan at 0 credits", async () => {
    const agency = await createAgency(1);
    expect((await canStartScan(agency.agencyId, agency.businessIds[0])).reason).toBe(REASONS.outOfCredits);
  });

  it("keeps top-ups unspendable once the plan is cancelled (F-20)", async () => {
    const agency = await createAgency(1);
    await topup(agency, 500);
    await setStatus(agency, "canceled");
    expect(await canSpendTopUps(agency.agencyId)).toEqual({ allowed: false, reason: REASONS.canceled });
    expect((await canStartScan(agency.agencyId, agency.businessIds[0])).allowed).toBe(false);
  });
});
