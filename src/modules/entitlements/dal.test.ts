import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";
import { loadAgencyFacts, loadBusinessFacts } from "./dal";
import { canAddBusiness, canFinishDraft, canSpendTopUps, canStartScan, maxQuestions, REASONS } from "./index";

// Runs against the local database `npm test` rebuilds.
const service = createServiceClient();
const userIds: string[] = [];
type Agency = { agencyId: string; businessIds: string[] };

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

/** `businesses` set-up businesses, then `drafts` still being set up (status "onboarding", as the wizard makes them). */
async function createAgency(businesses: number, drafts = 0): Promise<Agency> {
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
  const rows = Array.from({ length: businesses }, (_, i) => ({
    owner_user_id: owner,
    agency_id: agency.data.id,
    name: `B${i}`,
    status: "active",
  }));
  const made = rows.length ? await service.from("businesses").insert(rows).select("id") : { data: [], error: null };
  if (made.error) throw made.error;
  // One at a time: migration 067 allows one wizard draft per agency, and these have no onboarding_step, like seeds.
  for (let i = 0; i < drafts; i++) {
    const draft = await service
      .from("businesses")
      .insert({ owner_user_id: owner, agency_id: agency.data.id, name: `Draft${i}`, status: "onboarding", onboarding_step: i === 0 ? 5 : null });
    if (draft.error) throw draft.error;
  }
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
      trialOver: false,
    });
  });

  it("stops a trial agency at its third business", async () => {
    const agency = await createAgency(2);
    expect(await canAddBusiness(agency.agencyId)).toEqual({ allowed: false, reason: REASONS.trialBusinessLimit });
  });

  it("never counts a draft still being set up, or a deleted business (D-16)", async () => {
    const agency = await createAgency(1, 2);
    const { error } = await service
      .from("businesses")
      .insert({ owner_user_id: userIds.at(-1)!, agency_id: agency.agencyId, name: "Gone", status: "active", deleted_at: new Date().toISOString() });
    if (error) throw error;
    expect((await loadAgencyFacts(agency.agencyId)).businessCount).toBe(1);
    expect(await canAddBusiness(agency.agencyId)).toEqual({ allowed: true, reason: "" });
  });

  it("lets a trial with 1 set-up business and a draft finish the draft", async () => {
    const agency = await createAgency(1, 1);
    expect(await canFinishDraft(agency.agencyId)).toEqual({ allowed: true, reason: "" });
  });

  it("refuses a third set-up business on a trial with 2 and a draft", async () => {
    const agency = await createAgency(2, 1);
    expect(await canFinishDraft(agency.agencyId)).toEqual({ allowed: false, reason: REASONS.trialBusinessLimit });
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

  it("uses the plan chosen for a business still being set up, before it has a subscription item", async () => {
    // Picked on the new-business plan picker (?plan=pro).
    const picked = await createAgency(1);
    await service.from("businesses").update({ requested_plan_id: "pro", status: "onboarding" }).eq("id", picked.businessIds[0]).throwOnError();
    expect(await loadBusinessFacts(picked.businessIds[0])).toMatchObject({ planName: "Pro", maxCompetitors: 10 });

    // Picked on the pricing page: the agency step keeps it on the owner.
    const priced = await createAgency(1);
    await service.from("businesses").update({ status: "onboarding" }).eq("id", priced.businessIds[0]).throwOnError();
    const owner = (await service.from("agencies").select("owner_user_id").eq("id", priced.agencyId).single().throwOnError()).data.owner_user_id;
    await service.auth.admin.updateUserById(owner, { app_metadata: { selected_plan: "pro" } });
    expect(await loadBusinessFacts(priced.businessIds[0])).toMatchObject({ planName: "Pro", maxCompetitors: 10 });

    // Once set up, only the subscription item counts; without one it is Starter, as before.
    await service.from("businesses").update({ status: "active" }).eq("id", priced.businessIds[0]).throwOnError();
    expect(await loadBusinessFacts(priced.businessIds[0])).toMatchObject({ planName: "Starter", maxCompetitors: 5 });
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

  it("blocks a scan of a business taken off the plan, and keeps trials and businesses with no plan item scanning (M1)", async () => {
    const agency = await createAgency(3);
    await topup(agency, 100);
    const [offPlan, trial, noItem] = agency.businessIds;
    const item = (businessId: string, status: string) => ({ business_id: businessId, agency_id: agency.agencyId, plan_id: "starter", status });
    await service.from("business_subscriptions").insert([item(offPlan, "canceled"), item(trial, "trialing")]).throwOnError();

    expect(await loadBusinessFacts(offPlan)).toMatchObject({ onPlan: false });
    expect(await canStartScan(agency.agencyId, offPlan)).toEqual({ allowed: false, reason: "This business is off your plan." });
    // A trial's item, and a test agency's or first business's missing one, are on the plan.
    expect(await canStartScan(agency.agencyId, trial)).toEqual({ allowed: true, reason: "" });
    expect(await canStartScan(agency.agencyId, noItem)).toEqual({ allowed: true, reason: "" });
  });

  it("keeps top-ups unspendable once the plan is cancelled (F-20)", async () => {
    const agency = await createAgency(1);
    await topup(agency, 500);
    await setStatus(agency, "canceled");
    expect(await canSpendTopUps(agency.agencyId)).toEqual({ allowed: false, reason: REASONS.canceled });
    expect((await canStartScan(agency.agencyId, agency.businessIds[0])).allowed).toBe(false);
  });
});
