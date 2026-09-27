import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fixtureSignals } from "./place-fixtures";
import type { FetchSignals } from "./places";

// B-50 against the local database: what the page reads, that loading it stores no Places data (D-73),
// and the one-click Track action.
// Each test creates users and signs in; the shared local stack can be slow.
vi.setConfig({ testTimeout: 30_000 });

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { trackCompetitor } = await import("./actions");
const { loadCompetitorsPage } = await import("./dal");

const COMPETITOR_COLUMNS =
  "id, name, places_id, place_id, source, confirmed, formatted_address, city, region, country, latitude, longitude, category, phone, domain, enrichment_status, created_at";
const BUSINESS_COLUMNS = "id, name, places_id, domain, phone, primary_city, primary_region, industry, updated_at";

async function createOwner() {
  const email = `vitest-competitors-page-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Competitors page test", is_test: true })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.id,
      name: "Sunrise Coffee Bar",
      status: "active",
      industry: "coffee_shop",
      primary_city: "Springfield",
      primary_region: "IL",
      places_id: "ChIJ-fixture-sunrise-coffee",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, businessId: business.id, client };
}

async function addCompetitors(businessId: string, list: { name: string; places_id: string | null }[]) {
  await service
    .from("business_competitors")
    .insert(
      list.map((c) => ({
        business_id: businessId,
        ...c,
        source: c.places_id ? "confirmed_place" : "manual",
        confirmed: true,
        // Tracked before the seeded scan, as in real use.
        created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      })),
    )
    .throwOnError();
}

/** One saved scan: every check names the business list given, as the scan writes it. */
async function addChecks(businessId: string, names: string[][]) {
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("visibility_results")
    .insert(
      names.map((answer, i) => ({
        run_id: run.id,
        business_id: businessId,
        provider: ["openai", "anthropic", "perplexity"][i % 3],
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        business_mentioned: answer.includes("Sunrise Coffee Bar"),
        competitors_mentioned: answer.filter((n) => n === "Bean House").map((name) => ({ name, position: 1 })),
        extracted_names: {
          promptVersion: "extract-names.v1",
          names: answer.map((name, p) => ({ name, position: p + 1, matches: null, competitorName: null })),
        },
        cached: false,
        answer_text: `answer ${i}`,
      })),
    )
    .throwOnError();
}

async function snapshot(businessId: string) {
  const [business, competitors, facts] = await Promise.all([
    service.from("businesses").select(BUSINESS_COLUMNS).eq("id", businessId).single().throwOnError(),
    service.from("business_competitors").select(COMPETITOR_COLUMNS).eq("business_id", businessId).order("name").throwOnError(),
    service.from("business_site_facts").select("business_id", { count: "exact", head: true }).eq("business_id", businessId).throwOnError(),
  ]);
  return { business: business.data, competitors: competitors.data, facts: facts.count };
}

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("loadCompetitorsPage", () => {
  it("shows live Places values and writes no Places data to the database", async () => {
    const owner = await createOwner();
    await addCompetitors(owner.businessId, [
      { name: "Bean House", places_id: "ChIJ-fixture-bean-house" },
      { name: "The Daily Grind", places_id: "ChIJ-fixture-daily-grind" },
    ]);
    await addChecks(owner.businessId, [
      ["Bean House", "Blue Door Coffee"],
      ["Bean House", "Sunrise Coffee Bar", "Blue Door Coffee"],
      ["Kiln Coffee Co"],
    ]);
    const before = await snapshot(owner.businessId);
    const calls: string[] = [];
    const fetchSignals: FetchSignals = async (id) => {
      calls.push(id);
      return fixtureSignals(id);
    };

    const view = await loadCompetitorsPage(owner.agencyId, owner.businessId, new Date(), fetchSignals);

    expect(calls.sort()).toEqual(["ChIJ-fixture-bean-house", "ChIJ-fixture-daily-grind", "ChIJ-fixture-sunrise-coffee"]);
    expect(view!.signals.find((s) => s.name === "Bean House")!.signals).toMatchObject({ rating: 4.7, reviewCount: 320 });
    expect(view!.leaderboard.map((r) => [r.name, r.score])).toEqual([
      ["Bean House", 67],
      ["Sunrise Coffee Bar", 33],
      ["The Daily Grind", 0],
    ]);
    expect(view!.also).toEqual([
      { name: "Blue Door Coffee", answers: 2 },
      { name: "Kiln Coffee Co", answers: 1 },
    ]);
    expect(view!.answers).toBe(3);
    expect(await snapshot(owner.businessId)).toEqual(before);
    expect(JSON.stringify(before)).not.toMatch(/4\.7|320|beanhouse|Coffee shop/);
  });

  it("returns null for another agency's business", async () => {
    const [a, b] = await Promise.all([createOwner(), createOwner()]);
    expect(await loadCompetitorsPage(a.agencyId, b.businessId, new Date(), fixtureSignals)).toBeNull();
  });

  it("marks Google as unavailable per row when Places fails", async () => {
    const owner = await createOwner();
    await addCompetitors(owner.businessId, [{ name: "Bean House", places_id: "ChIJ-fixture-bean-house" }]);
    const view = await loadCompetitorsPage(owner.agencyId, owner.businessId, new Date(), async () => {
      throw new Error("down");
    });
    expect(view!.signals.map((s) => s.status)).toEqual(["error", "error"]);
  });
});

describe("trackCompetitor", () => {
  it("needs a session", async () => {
    expect(await trackCompetitor({ businessId: randomUUID(), name: "Blue Door Coffee" })).toMatchObject({ ok: false, status: 401 });
  });

  it("adds the name only, once, and refuses someone else's business", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = owner.client;
    expect(await trackCompetitor({ businessId: owner.businessId, name: " Blue Door Coffee " })).toEqual({
      ok: true,
      data: { name: "Blue Door Coffee" },
    });
    expect(await trackCompetitor({ businessId: owner.businessId, name: "blue door coffee" })).toMatchObject({ ok: true });
    const { competitors } = await snapshot(owner.businessId);
    expect(competitors).toHaveLength(1);
    expect(competitors![0]).toMatchObject({ name: "Blue Door Coffee", places_id: null, source: "manual", confirmed: true });

    expect(await trackCompetitor({ businessId: other.businessId, name: "Blue Door Coffee" })).toMatchObject({ ok: false, status: 404 });
    expect(await trackCompetitor({ businessId: owner.businessId, name: "" })).toMatchObject({ ok: false, status: 400 });
  });

  it("stops at the plan limit", async () => {
    const owner = await createOwner();
    await addCompetitors(
      owner.businessId,
      ["A1 Cafe", "B2 Cafe", "C3 Cafe", "D4 Cafe", "E5 Cafe"].map((name) => ({ name, places_id: null })),
    );
    session = owner.client;
    expect(await trackCompetitor({ businessId: owner.businessId, name: "Blue Door Coffee" })).toEqual({
      ok: false,
      status: 403,
      error: "Your plan tracks up to 5 competitors. Remove one to track another.",
    });
  });
});
