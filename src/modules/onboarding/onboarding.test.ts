import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { BLOCKED_DOMAIN, BLOCKED_PAGES, BLOCKED_PLACE, COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "./fixtures";
import { AUTOFILL_MODEL } from "./prompts/business-autofill.v1";

// B-34 against the local database: the action's checks, and what auto-fill stores (D-73).
const service = createServiceClient();
const userIds: string[] = [];

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    }),
}));

const { autofillBusiness } = await import("./actions");
const { runBusinessAutofill } = await import("./dal");

async function createOwner() {
  const email = `vitest-autofill-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency, error: agencyError } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Autofill test", is_test: true })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Draft" })
    .select("id")
    .single();
  if (businessError) throw businessError;
  return { userId: data.user.id, businessId: business.id, email, password };
}

async function signIn(email: string, password: string) {
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = client;
}

async function stored(businessId: string) {
  const [business, facts] = await Promise.all([
    service.from("businesses").select("places_id, name, phone, description, industry, primary_city, services").eq("id", businessId).single(),
    service.from("business_site_facts").select("data").eq("business_id", businessId).maybeSingle(),
  ]);
  return { business: business.data, facts: facts.data?.data ?? null };
}

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("autofillBusiness action", () => {
  it("returns 401 without a session", async () => {
    expect(await autofillBusiness({ businessId: randomUUID(), domain: "sunrise-coffee.com" })).toEqual({
      ok: false,
      status: 401,
      error: "Please log in to continue.",
    });
  });

  it("rejects bad input and someone else's business before calling any provider", async () => {
    const mine = await createOwner();
    const theirs = await createOwner();
    await signIn(mine.email, mine.password);

    expect(await autofillBusiness({ businessId: mine.businessId })).toMatchObject({ ok: false, status: 400 });
    expect(await autofillBusiness({ businessId: mine.businessId, domain: "localhost" })).toMatchObject({
      ok: false,
      status: 400,
      error: "Enter a website address like yourbusiness.com.",
    });
    expect(await autofillBusiness({ businessId: theirs.businessId, domain: "sunrise-coffee.com" })).toEqual({
      ok: false,
      status: 404,
      error: "Business not found.",
    });
  });
});

describe("runBusinessAutofill", () => {
  it("stores only place_id from Places and the site's own facts; the form values are not saved", async () => {
    const owner = await createOwner();
    await signIn(owner.email, owner.password);
    const { clients } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });

    const result = await runBusinessAutofill(owner.userId, owner.businessId, { domain: COFFEE_DOMAIN }, clients);
    expect(result?.details.name).toBe(COFFEE_PLACE.name);

    const { business, facts } = await stored(owner.businessId);
    expect(business).toMatchObject({
      places_id: COFFEE_PLACE.placeId,
      name: "Draft",
      phone: null,
      description: null,
      industry: null,
      primary_city: null,
      services: [],
    });
    expect(facts).toMatchObject({ domain: COFFEE_DOMAIN, facts: COFFEE_SITE_OUTPUT });
    const everything = JSON.stringify({ business, facts });
    expect(everything).not.toContain(COFFEE_PLACE.name!);
    expect(everything).not.toContain(COFFEE_PLACE.address!);
  });

  it("saves no site facts for a blocked site, and returns null for another user's business", async () => {
    const owner = await createOwner();
    const other = await createOwner();
    await signIn(owner.email, owner.password);
    const { clients, calls } = fakeClients({ pages: BLOCKED_PAGES, places: { [BLOCKED_DOMAIN]: [BLOCKED_PLACE] } });

    const result = await runBusinessAutofill(owner.userId, owner.businessId, { domain: BLOCKED_DOMAIN }, clients);
    expect(result?.details.name).toBe(BLOCKED_PLACE.name);
    expect((await stored(owner.businessId)).facts).toBeNull();

    expect(await runBusinessAutofill(owner.userId, other.businessId, { domain: BLOCKED_DOMAIN }, clients)).toBeNull();
    expect(calls.scrape).toEqual([BLOCKED_DOMAIN]);
  });
});
