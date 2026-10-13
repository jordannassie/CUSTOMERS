import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "../../fixtures";

// Changing the website during setup, against the local database (2026-10-13): the details step kept the old
// website's name, industry and description.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const actions = await import("../actions");
const { saveAgency, startBusiness } = await import("../dal");

async function signUp() {
  const email = `vitest-restart-${randomUUID()}@example.test`;
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

const coffee = () =>
  fakeClients({ pages: COFFEE_PAGES, places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] }, outputs: { "claude-haiku-4-5": COFFEE_SITE_OUTPUT } }).clients;

async function business(id: string) {
  const { data } = await service.from("businesses").select("name, primary_city, onboarding_step").eq("id", id).single().throwOnError();
  return data;
}

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("website step", () => {
  it("starts over when the website changes, so nothing of the old website carries into the new one (2026-10-13)", async () => {
    const userId = await signUp();
    const started = await startBusiness(userId, { domain: COFFEE_DOMAIN }, coffee());
    if (!started.ok) throw new Error("website step failed");
    const id = started.businessId;
    expect(
      await actions.saveDetailsStep({
        businessId: id,
        name: "Sunrise Coffee Bar",
        industry: "coffee_shop",
        description: "Coffee roasted in house.",
        services: ["espresso", "pastries"],
        city: "Springfield",
        state: "IL",
        country: "US",
        phone: "(217) 555-0142",
      }),
    ).toEqual({ ok: true, data: null });
    await service.from("business_competitors").insert({ business_id: id, name: "Bean House", source: "manual", confirmed: true }).throwOnError();

    // The user typed the wrong website and goes back to fix it.
    const again = await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients);
    if (!again.ok) throw new Error("website step failed");
    expect(again.businessId).toBe(id);
    const { data: row } = await service
      .from("businesses")
      .select("name, domain, industry, description, services, primary_city, phone, onboarding_step")
      .eq("id", id)
      .single()
      .throwOnError();
    expect(row).toEqual({
      name: "orange-florist.example",
      domain: "orange-florist.example",
      industry: null,
      description: null,
      services: [],
      primary_city: null,
      phone: null,
      onboarding_step: 4,
    });
    const competitors = await service.from("business_competitors").select("id").eq("business_id", id);
    expect(competitors.data).toEqual([]);
    const facts = await service.from("business_site_facts").select("data").eq("business_id", id).maybeSingle();
    expect((facts.data?.data as { domain?: string } | undefined)?.domain ?? null).not.toBe(COFFEE_DOMAIN);

    // The same website entered again keeps what the user confirmed.
    await actions.saveDetailsStep({ businessId: id, name: "Orange Florist", industry: "Florist", description: "", services: [], city: "Orange", state: "CA", country: "US", phone: "" });
    await startBusiness(userId, { domain: "orange-florist.example" }, fakeClients().clients);
    expect(await business(id)).toMatchObject({ name: "Orange Florist", primary_city: "Orange", onboarding_step: 5 });
  });
});
