import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fakeClients } from "../fixtures";
import { COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "../question-fixtures";
import { draftLabel } from "./steps";

// Against the local database: the wizard's saves change only the user's draft (a live business is edited in the app,
// where an ended plan is read-only), and a new city on the details step rebuilds the suggested questions.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { refresh } = await import("next/cache");
const actions = await import("./actions");
const { confirmBusinessPlace } = await import("../actions");
const { saveAgency, startBusiness } = await import("./dal");
const { saveDetails } = await import("./details/dal");
const { finishWizard } = await import("./questions/dal");

async function signUp() {
  const email = `vitest-draft-${randomUUID()}@example.test`;
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

async function draft(userId: string, request: { domain: string } | { name: string; city: string } = { domain: "sunrise-coffee.example" }) {
  const started = await startBusiness(userId, request, fakeClients().clients);
  if (!started.ok) throw new Error("website step failed");
  return started.businessId;
}

// What the wizard's saves could write on a business.
const COLUMNS = "name, industry, description, services, primary_city, primary_region, phone, places_id, models, scan_frequency, onboarding_step, status";

const details = (businessId: string, city = "Springfield") => ({
  businessId,
  name: "Sunrise Coffee",
  industry: "coffee_shop",
  description: "",
  services: [],
  city,
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

describe("wizard saves", () => {
  it("refuse a business that is already set up, and change nothing on it", async () => {
    const userId = await signUp();
    const id = await draft(userId, { name: "Sunrise Coffee", city: "Springfield" });
    expect(await actions.saveDetailsStep(details(id))).toEqual({ ok: true, data: null });
    expect(await finishWizard(userId, id, { models: ["openai"], frequency: "weekly" })).toBe(true);
    await service.from("tracked_prompts").insert({ business_id: id, prompt: "Best coffee in Springfield, IL?", source: "library", active: true }).throwOnError();
    const row = async () =>
      (await service.from("businesses").select(COLUMNS).eq("id", id).single().throwOnError()).data;
    const before = await row();

    const notFound = { ok: false, status: 404, error: "Business not found." };
    expect(await actions.saveDetailsStep({ ...details(id, "Dallas"), name: "Renamed" })).toEqual(notFound);
    expect(await actions.saveCompetitorsStep({ businessId: id, competitors: [{ name: "Bean House", placesId: null }] })).toEqual(notFound);
    expect(await actions.saveQuestionsStep({ businessId: id, questions: ["Which cafe in Springfield has the best latte?"] })).toEqual(notFound);
    expect(await actions.saveModelsStep({ businessId: id, models: ["perplexity"], frequency: "daily" })).toEqual(notFound);
    expect(await confirmBusinessPlace({ businessId: id, placeId: "ChIJ-someone-else" })).toEqual(notFound);

    expect(await row()).toEqual(before);
    expect((await service.from("business_competitors").select("id").eq("business_id", id)).data).toEqual([]);
    const prompts = await service.from("tracked_prompts").select("prompt, active, removed_at").eq("business_id", id);
    expect(prompts.data).toEqual([{ prompt: "Best coffee in Springfield, IL?", active: true, removed_at: null }]);
  });

  it("still save the user's draft", async () => {
    const userId = await signUp();
    const id = await draft(userId);
    expect(await actions.saveDetailsStep(details(id))).toEqual({ ok: true, data: null });
    expect(await actions.saveCompetitorsStep({ businessId: id, competitors: [{ name: "Bean House", placesId: null }] })).toEqual({ ok: true, data: { count: 1 } });
    expect(await actions.saveQuestionsStep({ businessId: id, questions: ["Which cafe in Springfield has the best latte?"] })).toEqual({ ok: true, data: { count: 1 } });
  });
});

describe("the draft's name in the sidebar (O2)", () => {
  it("is the website until the details step saves the name, then the name, and the app frame refreshes when it shows", async () => {
    const userId = await signUp();
    const id = await draft(userId);
    const label = async () => draftLabel((await service.from("businesses").select("name, domain").eq("id", id).single().throwOnError()).data);
    expect(await label()).toBe("Finish setting up sunrise-coffee.example");

    vi.mocked(refresh).mockClear();
    expect(await actions.saveDetailsStep({ ...details(id), name: "" })).toMatchObject({ ok: false, status: 400 });
    expect(refresh).not.toHaveBeenCalled();
    // The first business: setup hides the app frame, so a refresh would only render the step being left again.
    expect(await actions.saveDetailsStep(details(id))).toEqual({ ok: true, data: null });
    expect(refresh).not.toHaveBeenCalled();
    expect(await label()).toBe("Finish setting up Sunrise Coffee");

    // With a set-up business the switcher shows during setup and names the draft, so the frame refreshes.
    const agency = (await service.from("agencies").select("id").eq("owner_user_id", userId).single().throwOnError()).data;
    await service
      .from("businesses")
      .insert({ owner_user_id: userId, agency_id: agency.id, name: "Done Bakery", domain: `done-${randomUUID().slice(0, 8)}.example`, primary_city: "Springfield", status: "active" })
      .throwOnError();
    expect(await actions.saveDetailsStep(details(id))).toEqual({ ok: true, data: null });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("details step", () => {
  it("rebuilds the suggested questions when the city changes, keeping the user's own", async () => {
    const userId = await signUp();
    const id = await draft(userId);
    expect(await actions.saveDetailsStep(details(id))).toEqual({ ok: true, data: null });
    await service
      .from("tracked_prompts")
      .insert([
        { business_id: id, prompt: "What is the best coffee shop in Springfield, IL?", source: "library", active: true },
        { business_id: id, prompt: "Who serves oat milk in Springfield?", source: "custom", active: true },
      ])
      .throwOnError();

    // Saved again unchanged: no new questions, no model call.
    const same = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK, write: new Error("no write") });
    expect(await saveDetails(userId, details(id), same.clients)).toBe(true);
    expect(same.calls).toEqual({ pick: 0, write: 0 });

    const moved = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK, write: new Error("no write") });
    expect(await saveDetails(userId, details(id, "Peoria"), moved.clients)).toBe(true);
    const rows = (await service.from("tracked_prompts").select("prompt, source, active, removed_at").eq("business_id", id)).data ?? [];
    expect(rows.find((r) => r.prompt.includes("Springfield, IL"))).toMatchObject({ active: false, removed_at: expect.any(String) });
    expect(rows.find((r) => r.source === "custom")).toMatchObject({ active: true, removed_at: null });
    const fresh = rows.filter((r) => r.active && r.source === "library");
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((r) => !r.prompt.includes("Springfield"))).toBe(true);
  });
});
