import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fakeClients } from "../../fixtures";

// Against the local database (D-16): a draft never counts toward the trial's 2 businesses, so a trial with 1 set-up
// business can always come back to its draft and finish it, while a third set-up business is refused at the finish.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const actions = await import("../actions");
const { loadWizardState, saveAgency, startBusiness } = await import("../dal");

const TRIAL_LIMIT = "Your trial includes 2 businesses. Upgrade to add more.";

async function trialWith(setUp: number) {
  const email = `vitest-draft-limit-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  const userId = data.user.id;
  const { agencyId } = await saveAgency(userId, "Blue Door Marketing", null);
  for (let i = 0; i < setUp; i++) {
    await service
      .from("businesses")
      .insert({ owner_user_id: userId, agency_id: agencyId, name: `Set up ${i}`, status: "active", domain: `set-up-${i}-${randomUUID().slice(0, 8)}.example` })
      .throwOnError();
  }
  return { userId, agencyId };
}

/** A draft saved up to the AI models step, as the wizard leaves it. */
async function draftAtModels(userId: string, agencyId: string, domain = "harbor-dental.example") {
  const { data } = await service
    .from("businesses")
    .insert({ owner_user_id: userId, agency_id: agencyId, name: domain, domain, status: "onboarding", onboarding_step: 7, primary_city: "Austin" })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

const status = async (id: string) => (await service.from("businesses").select("status").eq("id", id).single().throwOnError()).data.status;
const finish = (businessId: string) => actions.saveModelsStep({ businessId, models: ["openai"], frequency: "weekly" });

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("a draft and the trial's business limit", () => {
  it("a trial with 1 set-up business and a draft resumes the draft and finishes it", async () => {
    const { userId, agencyId } = await trialWith(1);
    const draftId = await draftAtModels(userId, agencyId);

    // The website step sent again (a refresh, or Add a business) finds the same draft, never the trial limit.
    const again = await startBusiness(userId, { domain: "harbor-dental.example" }, fakeClients().clients);
    expect(again).toMatchObject({ ok: true, businessId: draftId });
    expect(await loadWizardState(userId)).toMatchObject({ draft: { id: draftId, step: 7 }, hasFinishedBusiness: true, needsCard: false });

    expect(await finish(draftId)).toEqual({ ok: true, data: { next: "/onboarding/first-scan" } });
    expect(await status(draftId)).toBe("active");
  });

  it("a trial with 2 set-up businesses and a draft cannot turn on a third; the draft stays saved", async () => {
    const { userId, agencyId } = await trialWith(2);
    const draftId = await draftAtModels(userId, agencyId);

    expect(await startBusiness(userId, { domain: "harbor-dental.example" }, fakeClients().clients)).toMatchObject({ ok: true, businessId: draftId });
    expect(await finish(draftId)).toEqual({ ok: false, status: 403, error: TRIAL_LIMIT });
    expect(await status(draftId)).toBe("onboarding");
  });

  it("a trial with 2 set-up businesses and no draft cannot start a new one", async () => {
    const { userId } = await trialWith(2);
    expect(await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients)).toEqual({
      ok: false,
      status: 403,
      error: TRIAL_LIMIT,
    });
  });

  it("a trial with 1 set-up business starts its second as a draft, then another tab finds that draft", async () => {
    const { userId } = await trialWith(1);
    const first = await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients);
    if (!first.ok) throw new Error(JSON.stringify(first));
    // The draft does not count: the same agency coming back is never refused.
    const second = await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients);
    expect(second).toMatchObject({ ok: true, businessId: first.businessId });
  });
});
