import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// B-41 against the local database: who gets the card step, and that only the webhook's link finishes it.
// Fixture mode stands in for Stripe, so no test here ever calls Stripe.
vi.hoisted(() => vi.stubEnv("STRIPE_CHECKOUT_FIXTURES", "true"));

const { env } = await import("@/lib/env");
const { createServiceClient } = await import("@/lib/supabase/service");
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const actions = await import("../actions");
const { saveAgency, loadWizardState } = await import("../dal");
const { finishCardStep, loadCardStep, startCardCheckout } = await import("./dal");

async function draftAtModels(opts: { isTest?: boolean; plan?: "starter" | "pro" } = {}) {
  const email = `vitest-card-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  const userId = data.user.id;
  await saveAgency(userId, "Blue Door Marketing", opts.plan ?? null);
  const agency = await service.from("agencies").update({ is_test: opts.isTest ?? false }).eq("owner_user_id", userId).select("id").single();
  const biz = await service
    .from("businesses")
    .insert({ owner_user_id: userId, agency_id: agency.data!.id, name: "Sunrise Coffee", status: "onboarding", onboarding_step: 7 })
    .select("id")
    .single();
  if (biz.error) throw biz.error;
  return { userId, email, agencyId: agency.data!.id, businessId: biz.data.id };
}

const businessRow = async (id: string) =>
  (await service.from("businesses").select("status, onboarding_step, models, scan_frequency").eq("id", id).single()).data;
// What checkout.session.completed does (B-42 linkStripe): the only thing that lets the step finish.
const webhookLinks = (agencyId: string) =>
  service.from("agencies").update({ stripe_customer_id: `cus_${randomUUID()}`, stripe_subscription_id: `sub_${randomUUID()}` }).eq("id", agencyId);

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("models step hands over to the card step", () => {
  it("keeps a paying agency's business a draft at step 8", async () => {
    const { businessId } = await draftAtModels();
    const saved = await actions.saveModelsStep({ businessId, models: ["openai", "anthropic"], frequency: "weekly" });
    expect(saved).toEqual({ ok: true, data: { next: "/onboarding/card" } });
    expect(await businessRow(businessId)).toMatchObject({ status: "onboarding", onboarding_step: 8, models: ["openai", "anthropic"] });
  });

  it("lets a test agency skip the card (D-61)", async () => {
    const { userId, businessId } = await draftAtModels({ isTest: true });
    expect((await loadWizardState(userId)).needsCard).toBe(false);
    const saved = await actions.saveModelsStep({ businessId, models: ["openai"], frequency: "daily" });
    expect(saved).toEqual({ ok: true, data: { next: "/dashboard" } });
    expect(await businessRow(businessId)).toMatchObject({ status: "active", onboarding_step: 9 });
  });
});

describe("card step", () => {
  it("shows the chosen plan's price from the plans table", async () => {
    const { userId, businessId } = await draftAtModels({ plan: "pro" });
    expect(await loadCardStep(userId, businessId)).toBeNull();
    await service.from("businesses").update({ onboarding_step: 8 }).eq("id", businessId);
    const plan = await service.from("plans").select("name, price_cents").eq("id", "pro").single();
    const step = await loadCardStep(userId, businessId);
    expect(step?.offer).toMatchObject({ planName: plan.data!.name, priceCents: plan.data!.price_cents, mode: "fixture", publishableKey: null });
    const days = (Date.parse(step!.offer!.trialEndsAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("starts a checkout, but only the webhook's link finishes the business", async () => {
    const { userId, email, agencyId, businessId } = await draftAtModels();
    await service.from("businesses").update({ onboarding_step: 8 }).eq("id", businessId);

    expect(await startCardCheckout({ id: userId, email }, businessId, "http://localhost/onboarding/card")).toEqual({
      ok: true,
      clientSecret: "cs_fixture_secret",
    });
    // The card form said yes, but no webhook yet: nothing is finished or granted.
    expect(await finishCardStep(userId, businessId)).toBe(false);
    expect(await businessRow(businessId)).toMatchObject({ status: "onboarding", onboarding_step: 8 });
    const grants = await service.from("credit_grants").select("id").eq("agency_id", agencyId);
    expect(grants.data).toEqual([]);

    await webhookLinks(agencyId);
    expect(await actions.checkCardStep({ businessId })).toEqual({ ok: true, data: { done: true, next: "/dashboard" } });
    expect(await businessRow(businessId)).toMatchObject({ status: "active", onboarding_step: 9 });

    // A second checkout would start a second subscription.
    expect(await startCardCheckout({ id: userId, email }, businessId, "http://localhost/onboarding/card")).toMatchObject({ ok: false, status: 409 });
  });

  it("refuses another user's business and a signed-out caller", async () => {
    const owner = await draftAtModels();
    await draftAtModels();
    expect(await actions.checkCardStep({ businessId: owner.businessId })).toMatchObject({ ok: false, status: 404 });
    session = null;
    expect(await actions.checkCardStep({ businessId: owner.businessId })).toMatchObject({ ok: false, status: 401 });
    expect(await actions.startCardStep({ businessId: owner.businessId })).toMatchObject({ ok: false, status: 401 });
  });
});
