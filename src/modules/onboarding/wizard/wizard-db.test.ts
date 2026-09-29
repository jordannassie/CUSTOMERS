import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "../fixtures";
import { FLORIST_WRITTEN, fakeQuestionClients } from "../question-fixtures";

// B-36 against the local database: one draft per user, resume, what is stored, and each step's checks.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const actions = await import("./actions");
const { loadWizardState, saveAgency, startBusiness } = await import("./dal");
const { finishWizard, loadQuestionsStep, saveQuestions } = await import("./questions/dal");

async function signUp(withAgency = true) {
  const email = `vitest-wizard-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  if (withAgency) await saveAgency(data.user.id, "Blue Door Marketing", null);
  return data.user.id;
}

const coffee = () =>
  fakeClients({
    pages: COFFEE_PAGES,
    places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] },
    outputs: { "claude-haiku-4-5": COFFEE_SITE_OUTPUT },
  }).clients;

async function business(id: string) {
  const { data, error } = await service
    .from("businesses")
    .select("name, domain, phone, primary_city, places_id, status, onboarding_step, models, scan_frequency")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("agency step", () => {
  it("creates the agency once, renames it on return, and keeps the pricing page plan", async () => {
    const userId = await signUp(false);
    expect(await actions.saveAgencyStep({ name: "First name", plan: "pro" })).toEqual({ ok: true, data: null });
    expect(await actions.saveAgencyStep({ name: "Blue Door", plan: "gold" })).toEqual({ ok: true, data: null });

    const rows = await service.from("agencies").select("name, status").eq("owner_user_id", userId);
    expect(rows.data).toEqual([{ name: "Blue Door", status: "trialing" }]);
    const user = await service.auth.admin.getUserById(userId);
    expect(user.data.user?.app_metadata.selected_plan).toBe("pro");
  });

  it("refuses a signed-out caller and an empty name", async () => {
    expect(await actions.saveAgencyStep({ name: "X", plan: null })).toMatchObject({ ok: false, status: 401 });
    await signUp(false);
    expect(await actions.saveAgencyStep({ name: "  ", plan: null })).toMatchObject({ ok: false, status: 400 });
  });
});

describe("website step", () => {
  it("reuses the one draft on return, fills the form, and stores only the place id (D-73)", async () => {
    const userId = await signUp();
    const first = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee());
    const second = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee());
    if (!first.ok || !second.ok) throw new Error("website step failed");

    expect(second.businessId).toBe(first.businessId);
    const drafts = await service.from("businesses").select("id").eq("owner_user_id", userId);
    expect(drafts.data).toHaveLength(1);
    expect(first.autofill.details).toMatchObject({ name: "Sunrise Coffee Bar & Roastery", phone: "(217) 555-0142", industry: "coffee_shop" });

    const row = await business(first.businessId);
    expect(row).toMatchObject({ name: COFFEE_DOMAIN, phone: null, primary_city: null, places_id: COFFEE_PLACE.placeId, onboarding_step: 4 });
    expect(await loadWizardState(userId)).toMatchObject({ draft: { id: first.businessId, step: 4 }, hasFinishedBusiness: false });
  });

  it("needs the agency first", async () => {
    const userId = await signUp(false);
    expect(await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee())).toMatchObject({ ok: false, status: 409 });
  });

  it("stops a trial agency at 2 businesses", async () => {
    const userId = await signUp();
    const agency = await service.from("agencies").select("id").eq("owner_user_id", userId).single();
    for (const name of ["One", "Two"]) {
      await service.from("businesses").insert({ owner_user_id: userId, agency_id: agency.data!.id, name, status: "active" });
    }
    expect(await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee())).toEqual({
      ok: false,
      status: 403,
      error: "Your trial includes 2 businesses. Upgrade to add more.",
    });
  });
});

describe("details, questions and models steps", () => {
  it("runs to the end: saves details, writes questions once, and finishes the business", async () => {
    const userId = await signUp();
    const started = await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients);
    if (!started.ok) throw new Error("website step failed");
    const id = started.businessId;

    const details = await actions.saveDetailsStep({
      businessId: id,
      name: "Orange Florist",
      industry: "Florist",
      description: "Wedding flowers and same-day delivery.",
      services: ["wedding flowers", "same-day delivery"],
      city: "Orange",
      state: "CA",
      country: "US",
      phone: "(714) 555-0100",
    });
    expect(details).toEqual({ ok: true, data: null });
    expect(await business(id)).toMatchObject({ name: "Orange Florist", onboarding_step: 5 });

    // A trade with no library: Claude writes the questions.
    const { clients, calls } = fakeQuestionClients({ write: [...FLORIST_WRITTEN] });
    const step = await loadQuestionsStep(userId, id, clients);
    if (!step || step === "no-city") throw new Error("questions step failed");
    expect(step.questions).toHaveLength(12);
    const again = await loadQuestionsStep(userId, id, clients);
    expect(again).toMatchObject({ questions: step.questions });
    expect(calls.write).toBe(1);
    const sources = await service.from("tracked_prompts").select("source").eq("business_id", id);
    // Suggested, not written by the user, so the Questions page does not say "Added by you" (BUG-9).
    expect(new Set(sources.data?.map((r) => r.source))).toEqual(new Set(["library"]));

    const tooMany = Array.from({ length: 26 }, (_, i) => `Question number ${i} in Orange`);
    expect(await saveQuestions(userId, id, tooMany)).toMatchObject({ ok: false, status: 403 });
    const edited = [...step.questions.slice(1), "Which florist in Orange delivers on Sundays?"];
    expect(await saveQuestions(userId, id, edited)).toEqual({ ok: true, count: 12 });
    const kept = await service.from("tracked_prompts").select("prompt, source").eq("business_id", id);
    expect(kept.data).toHaveLength(12);
    expect(kept.data).toContainEqual({ prompt: "Which florist in Orange delivers on Sundays?", source: "custom" });
    expect(kept.data).toContainEqual({ prompt: step.questions[1], source: "library" });

    expect(await finishWizard(userId, id, { models: ["openai", "perplexity"], frequency: "monthly" })).toBe(true);
    expect(await business(id)).toMatchObject({ status: "active", onboarding_step: 9, models: ["openai", "perplexity"], scan_frequency: "monthly" });
    const profile = await service.from("profiles").select("active_business_id").eq("id", userId).single();
    expect(profile.data?.active_business_id).toBe(id);
    expect(await loadWizardState(userId)).toMatchObject({ draft: null, hasFinishedBusiness: true });
  });

  it("keeps one set of questions when two loads prepare them at once", async () => {
    const userId = await signUp();
    const started = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee());
    if (!started.ok) throw new Error("website step failed");
    await service.from("businesses").update({ primary_city: "Springfield", industry: "Florist" }).eq("id", started.businessId);

    const { clients } = fakeQuestionClients({ write: [...FLORIST_WRITTEN] });
    const [one, two] = await Promise.all([
      loadQuestionsStep(userId, started.businessId, clients),
      loadQuestionsStep(userId, started.businessId, clients),
    ]);
    const rows = await service.from("tracked_prompts").select("prompt").eq("business_id", started.businessId);
    expect(rows.data).toHaveLength(12);
    expect(one).toMatchObject({ questions: two && two !== "no-city" ? two.questions : [] });
  });

  it("refuses another user's business", async () => {
    const owner = await signUp();
    const started = await startBusiness(owner, { domain: COFFEE_DOMAIN }, coffee());
    if (!started.ok) throw new Error("website step failed");
    await signUp();
    expect(await actions.saveModelsStep({ businessId: started.businessId, models: ["openai"], frequency: "weekly" })).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(await actions.saveModelsStep({ businessId: started.businessId, models: [], frequency: "weekly" })).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
