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

const { autofillBusiness, confirmBusinessPlace } = await import("./actions");
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

  it("saves only which pages blocked us for a blocked site, and returns null for another user's business", async () => {
    const owner = await createOwner();
    const other = await createOwner();
    await signIn(owner.email, owner.password);
    const { clients, calls } = fakeClients({ pages: BLOCKED_PAGES, places: { [BLOCKED_DOMAIN]: [BLOCKED_PLACE] } });

    const result = await runBusinessAutofill(owner.userId, owner.businessId, { domain: BLOCKED_DOMAIN }, clients);
    expect(result?.details.name).toBe(BLOCKED_PLACE.name);
    // No facts and no model, only the page results, so advice knows the site blocked us (BUG-087).
    const facts = (await stored(owner.businessId)).facts as { facts: unknown; model: unknown; pages: { status: string }[] };
    expect(facts).toMatchObject({ facts: null, model: null });
    expect(facts.pages.some((p) => p.status === "blocked")).toBe(true);

    expect(await runBusinessAutofill(owner.userId, other.businessId, { domain: BLOCKED_DOMAIN }, clients)).toBeNull();
    expect(calls.scrape).toEqual([BLOCKED_DOMAIN]);
  });

  it("fills from the Google listing for the brand a domain spells when the site can't be read, and logs why (B7)", async () => {
    const owner = await createOwner();
    await signIn(owner.email, owner.password);
    const domain = `ebookwoman${randomUUID().replace(/[^a-f]/g, "").slice(0, 8)}.com`;
    const brand = domain.split(".")[0].slice(1);
    const place = { ...BLOCKED_PLACE, placeId: `ChIJ-fixture-${brand}`, name: "BookWoman", websiteUri: `https://www.${domain}/` };
    const { clients } = fakeClients({ pages: BLOCKED_PAGES, places: { [brand]: [place] } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await runBusinessAutofill(owner.userId, owner.businessId, { domain }, clients);
    expect(result?.details.name).toBe("BookWoman");
    expect((await stored(owner.businessId)).business).toMatchObject({ places_id: place.placeId });

    const { data } = await service.from("provider_errors").select("provider, message").like("message", `%${domain}%`);
    expect(data).toEqual([{ provider: "firecrawl", message: expect.stringContaining(`Nothing readable on ${domain}`) }]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(domain));
    warn.mockRestore();
    await service.from("provider_errors").delete().like("message", `%${domain}%`);
  });
});

describe("no website: picking the Google listing (MVP_SPEC 3.3)", () => {
  async function noWebsiteOwner() {
    const owner = await createOwner();
    await service.from("businesses").update({ has_website: false, name: "Sunrise Coffee", primary_city: "Springfield" }).eq("id", owner.businessId);
    await signIn(owner.email, owner.password);
    return owner;
  }

  it("saves no place_id while searching, then the picked listing's place_id and nothing else", async () => {
    const owner = await noWebsiteOwner();
    const { clients } = fakeClients({ places: { "Sunrise Coffee Springfield": [COFFEE_PLACE] } });

    const result = await runBusinessAutofill(owner.userId, owner.businessId, { name: "Sunrise Coffee", city: "Springfield" }, clients);
    expect(result?.choices?.map((c) => c.placeId)).toEqual([COFFEE_PLACE.placeId]);
    expect((await stored(owner.businessId)).business).toMatchObject({ places_id: null, name: "Sunrise Coffee" });

    expect(await confirmBusinessPlace({ businessId: owner.businessId, placeId: COFFEE_PLACE.placeId })).toEqual({ ok: true, data: null });
    const { business } = await stored(owner.businessId);
    expect(business).toMatchObject({ places_id: COFFEE_PLACE.placeId, name: "Sunrise Coffee", phone: null, primary_city: "Springfield" });
    expect(JSON.stringify(business)).not.toContain(COFFEE_PLACE.address!);
  });

  it("None of these clears the place_id and keeps the typed name", async () => {
    const owner = await noWebsiteOwner();
    await service.from("businesses").update({ places_id: COFFEE_PLACE.placeId }).eq("id", owner.businessId);
    expect(await confirmBusinessPlace({ businessId: owner.businessId, placeId: null })).toEqual({ ok: true, data: null });
    expect((await stored(owner.businessId)).business).toMatchObject({ places_id: null, name: "Sunrise Coffee" });
  });

  it("checks the session, the input, and that the business is the user's own without a website", async () => {
    const pick = { businessId: randomUUID(), placeId: COFFEE_PLACE.placeId };
    expect(await confirmBusinessPlace(pick)).toMatchObject({ ok: false, status: 401 });

    const owner = await noWebsiteOwner();
    const other = await createOwner();
    expect(await confirmBusinessPlace({ businessId: owner.businessId, placeId: "../bad" })).toMatchObject({ ok: false, status: 400 });
    expect(await confirmBusinessPlace({ ...pick, businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    await service.from("businesses").update({ has_website: true }).eq("id", owner.businessId);
    expect(await confirmBusinessPlace({ ...pick, businessId: owner.businessId })).toMatchObject({ ok: false, status: 404 });
    expect((await stored(other.businessId)).business?.places_id).toBeNull();
  });
});
