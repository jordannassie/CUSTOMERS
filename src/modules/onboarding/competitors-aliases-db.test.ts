import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { NEARBY_CANDIDATES } from "./competitor-fixtures";

// Other names saved with competitors (2026-10-15, 2026-10-16), against the local database. Same set-up as competitors-db.
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

const { saveCompetitorList } = await import("./actions");

async function createOwner(plan?: "pro") {
  const email = `vitest-competitors-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const agency = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Competitor test", is_test: true })
    .select("id")
    .single();
  if (agency.error) throw agency.error;
  const business = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.data.id,
      name: "Sunrise Coffee Bar",
      industry: "coffee_shop",
      primary_city: "Springfield",
      primary_region: "IL",
    })
    .select("id")
    .single();
  if (business.error) throw business.error;
  if (plan) {
    const sub = await service
      .from("business_subscriptions")
      .insert({ business_id: business.data.id, agency_id: agency.data.id, plan_id: plan });
    if (sub.error) throw sub.error;
  }
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { userId: data.user.id, businessId: business.data.id, client };
}

const pick = (n: number) => NEARBY_CANDIDATES.filter((c) => c.name !== "Sunrise Coffee Bar").slice(0, n);
const asInput = (list: typeof NEARBY_CANDIDATES) => list.map((c) => ({ name: c.name, placesId: c.placeId }));

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("other names saved with competitors", () => {
  it("saves a plain competitor and a long-name one together (2026-10-16: not-null aliases broke the step)", async () => {
    const owner = await createOwner();
    session = owner.client;
    const [bean, grind] = pick(2);
    const input = [
      { name: bean.name, placesId: bean.placeId },
      { name: grind.name, placesId: grind.placeId, aliases: [`${grind.name} - Coffee & Brunch in Springfield`] },
    ];
    expect(await saveCompetitorList({ businessId: owner.businessId, competitors: input })).toMatchObject({ ok: true, data: { count: 2 } });
    const { data } = await service.from("business_competitors").select("name, aliases").eq("business_id", owner.businessId).order("name").throwOnError();
    expect(data).toEqual(
      [
        { name: bean.name, aliases: [] },
        { name: grind.name, aliases: [`${grind.name} - Coffee & Brunch in Springfield`] },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    );
  });

  it("keeps the long Google name as another name when the short brand is saved (2026-10-15)", async () => {
    const owner = await createOwner();
    session = owner.client;
    const [bean] = pick(1);
    const long = `${bean.name} - Coffee, Pastries & Brunch in Springfield`;
    const input = [{ name: bean.name, placesId: bean.placeId, aliases: [long] }];
    expect(await saveCompetitorList({ businessId: owner.businessId, competitors: input })).toMatchObject({ ok: true });
    const aliasesOf = async () =>
      (await service.from("business_competitors").select("aliases").eq("business_id", owner.businessId).single().throwOnError()).data.aliases;
    expect(await aliasesOf()).toEqual([long]);

    // Saved again, with another name the owner added in the meantime: both stay, once each.
    await service.from("business_competitors").update({ aliases: [long, "Bean House Cafe"] }).eq("business_id", owner.businessId).throwOnError();
    expect(await saveCompetitorList({ businessId: owner.businessId, competitors: input })).toMatchObject({ ok: true });
    expect(await aliasesOf()).toEqual([long, "Bean House Cafe"]);
    // A save without aliases (the list reloaded) leaves them alone.
    expect(await saveCompetitorList({ businessId: owner.businessId, competitors: asInput([bean]) })).toMatchObject({ ok: true });
    expect(await aliasesOf()).toEqual([long, "Bean House Cafe"]);
  });
});
