import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { DUPLICATE_BUSINESS_TEXT } from "../duplicates";
import { COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "../fixtures";
import { COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "../question-fixtures";

// Back, then Continue again, against the local database (2026-10-16): one draft per agency whatever the clicks and
// tabs, no second auto-fill for the same website, questions rebuilt only for a new trade, services or place.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const actions = await import("./actions");
const { saveAgency, startBusiness } = await import("./dal");
const { saveDetails } = await import("./details/dal");
const { loadQuestionsStep, saveQuestions } = await import("./questions/dal");

async function signUp() {
  const email = `vitest-back-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  await saveAgency(data.user.id, "Blue Door Marketing", null);
  return data.user.id;
}

const coffee = () => fakeClients({ pages: COFFEE_PAGES, places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] }, outputs: { "claude-haiku-4-5": COFFEE_SITE_OUTPUT } });
const questionClients = () => fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK, write: new Error("no write") });
const businessesOf = async (userId: string) =>
  (await service.from("businesses").select("id, domain, onboarding_step").eq("owner_user_id", userId).throwOnError()).data ?? [];

const details = (businessId: string, services = ["espresso", "pastries"]) => ({
  businessId,
  name: "Sunrise Coffee",
  industry: "coffee_shop",
  description: "",
  services,
  city: "Springfield",
  state: "IL",
  country: "US",
  phone: "",
});

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("website step", () => {
  it("makes one draft for a double submit (one key) and for two tabs at once (two keys)", async () => {
    const userId = await signUp();
    const key = randomUUID();
    const twice = await Promise.all([0, 1].map(() => startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients, null, key)));
    const tabs = await Promise.all([0, 1].map(() => startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients, null, randomUUID())));
    const ids = new Set([...twice, ...tabs].map((r) => (r.ok ? r.businessId : r.error)));
    expect(ids.size).toBe(1);
    expect(await businessesOf(userId)).toHaveLength(1);
  });

  it("a vague Other label is refused with the hint the field shows (2026-10-16)", async () => {
    const userId = await signUp();
    const started = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients);
    if (!started.ok) throw new Error("website step failed");
    expect(await actions.saveDetailsStep({ ...details(started.businessId), industry: "Consultant" })).toEqual({
      ok: false,
      status: 400,
      error: "What kind of business is it? For example: marketing agency, IT consultant.",
    });
    expect(await actions.saveDetailsStep({ ...details(started.businessId), industry: "IT consultant" })).toEqual({ ok: true, data: null });
  });

  it("runs auto-fill again only when the website changes (no second AI cost for Back, then Continue)", async () => {
    const userId = await signUp();
    const first = coffee();
    const started = await startBusiness(userId, { domain: COFFEE_DOMAIN }, first.clients);
    if (!started.ok) throw new Error("website step failed");
    expect(started.autofill).not.toBeNull();
    expect(first.calls.extract.length).toBeGreaterThan(0);

    const again = coffee();
    expect(await startBusiness(userId, { domain: COFFEE_DOMAIN }, again.clients)).toEqual({ ok: true, businessId: started.businessId, autofill: null });
    expect(await actions.saveDetailsStep(details(started.businessId))).toEqual({ ok: true, data: null });
    expect(await startBusiness(userId, { domain: COFFEE_DOMAIN }, again.clients)).toMatchObject({ autofill: null });
    expect(again.calls).toEqual({ scrape: [], places: [], extract: [] });
    // The confirmed details and progress stay.
    const [row] = await businessesOf(userId);
    expect(row).toMatchObject({ id: started.businessId, onboarding_step: 5 });

    const other = fakeClients();
    const moved = await startBusiness(userId, { domain: "orange-florist.example" }, other.clients);
    expect(moved).toMatchObject({ ok: true, businessId: started.businessId, autofill: expect.any(Object) });
    expect(other.calls.scrape).toEqual(["orange-florist.example"]);
    expect(await businessesOf(userId)).toEqual([{ id: started.businessId, domain: "orange-florist.example", onboarding_step: 4 }]);
  });

  it("refuses a website another business in the agency has, in plain words, and keeps the draft as it was", async () => {
    const userId = await signUp();
    const agency = await service.from("agencies").select("id").eq("owner_user_id", userId).single().throwOnError();
    await service.from("businesses").insert({ owner_user_id: userId, agency_id: agency.data.id, name: "Live", domain: COFFEE_DOMAIN, status: "active" }).throwOnError();
    const refused = { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
    expect(await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients)).toEqual(refused);

    const draft = await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients);
    if (!draft.ok) throw new Error("website step failed");
    expect(await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients)).toEqual(refused);
    const row = (await businessesOf(userId)).find((b) => b.id === draft.businessId);
    expect(row).toMatchObject({ domain: "orange-florist.example", onboarding_step: 4 });
  });
});

describe("details, competitors and questions steps sent again", () => {
  it("rebuilds the suggestions only for new services, keeps the user's own, and says so once", async () => {
    const userId = await signUp();
    const started = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients);
    if (!started.ok) throw new Error("website step failed");
    const id = started.businessId;
    expect(await saveDetails(userId, details(id), questionClients().clients)).toBe(true);
    const step = await loadQuestionsStep(userId, id, questionClients().clients);
    if (!step || step === "no-city") throw new Error("questions step failed");
    expect(step.updated).toBe(false);
    const own = "Which cafe in Springfield has oat milk?";
    expect(await saveQuestions(userId, id, [...step.questions, own])).toEqual({ ok: true, count: 13 });

    // Back to details, Continue with nothing changed: no rebuild, no model call, no notice.
    const same = questionClients();
    expect(await saveDetails(userId, details(id, ["Pastries", " espresso"]), same.clients)).toBe(true);
    expect(same.calls).toEqual({ pick: 0, write: 0 });
    expect(await loadQuestionsStep(userId, id, same.clients)).toMatchObject({ questions: [...step.questions, own], updated: false });

    // New services: a new set, the user's own question kept, and the notice until the step is saved.
    expect(await saveDetails(userId, details(id, ["espresso", "pastries", "wedding catering"]), questionClients().clients)).toBe(true);
    const rebuilt = await loadQuestionsStep(userId, id, questionClients().clients);
    if (!rebuilt || rebuilt === "no-city") throw new Error("questions step failed");
    expect(rebuilt.updated).toBe(true);
    expect(rebuilt.questions).toContain(own);
    expect(await saveQuestions(userId, id, rebuilt.questions)).toMatchObject({ ok: true });
    expect(await loadQuestionsStep(userId, id, questionClients().clients)).toMatchObject({ updated: false });
  });

  it("two saves at once keep one competitor list and add a new question once", async () => {
    const userId = await signUp();
    const started = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee().clients);
    if (!started.ok) throw new Error("website step failed");
    const id = started.businessId;
    expect(await saveDetails(userId, details(id), questionClients().clients)).toBe(true);

    const competitors = [{ name: "Bean House", placesId: null }, { name: "Daily Grind", placesId: "ChIJ-daily-grind" }];
    const saves = await Promise.all([0, 1].map(() => actions.saveCompetitorsStep({ businessId: id, competitors })));
    expect(saves).toEqual([{ ok: true, data: { count: 2 } }, { ok: true, data: { count: 2 } }]);
    const rows = await service.from("business_competitors").select("name").eq("business_id", id).order("name").throwOnError();
    expect(rows.data).toEqual([{ name: "Bean House" }, { name: "Daily Grind" }]);
    // Back, then Continue with the same list: nothing added or removed.
    expect(await actions.saveCompetitorsStep({ businessId: id, competitors })).toEqual({ ok: true, data: { count: 2 } });
    expect((await service.from("business_competitors").select("id").eq("business_id", id).throwOnError()).data).toHaveLength(2);

    const questions = ["Which cafe in Springfield has the best latte?", "Where can I get oat milk in Springfield?"];
    await Promise.all([0, 1].map(() => actions.saveQuestionsStep({ businessId: id, questions })));
    const prompts = await service.from("tracked_prompts").select("prompt").eq("business_id", id).eq("active", true).throwOnError();
    expect(prompts.data?.map((p) => p.prompt).sort()).toEqual([...questions].sort());
  });
});
