import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { FakeStripe } from "./fake-stripe.test-helpers";

// B-44 actions against the local database, signed in as a real user, with the in-memory Stripe in place of
// the real client: auth, input checks, agency scoping and the trial business limit (canAddBusiness).
vi.setConfig({ testTimeout: 30_000 });

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;
let fake: FakeStripe | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));
vi.mock("../stripe", () => ({ getStripe: () => ({}) }));
vi.mock("./client", () => ({ stripePlanChangeClient: () => fake }));
// Real reads; only the plans' Stripe price IDs are swapped for the ones the in-memory Stripe knows.
vi.mock("./dal", async (importOriginal) => {
  const real = await importOriginal<typeof import("./dal")>();
  return {
    loadPlanChangeData: async (agencyId: string) => {
      const data = await real.loadPlanChangeData(agencyId);
      const plans = data.context.plans.map((p) => ({ ...p, stripePriceId: p.id === "starter" || p.id === "pro" ? `price_${p.id}` : null }));
      return { ...data, context: { ...data.context, plans } };
    },
  };
});

const { addBusiness, upgradeBusiness } = await import("./actions");

async function seedAgency(status: "active" | "trialing", businessNames: string[]) {
  const email = `vitest-plan-change-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Plan change test", is_test: true, status, stripe_subscription_id: "sub_fake" })
    .select("id")
    .single()
    .throwOnError();
  const { data: businesses } = await service
    .from("businesses")
    .insert(businessNames.map((name) => ({ owner_user_id: data.user.id, agency_id: agency.id, name, status: "active" })))
    .select("id, name")
    .throwOnError();
  const ids = businessNames.map((name) => businesses.find((b) => b.name === name)!.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, ids, client };
}

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

function useFake(status: "active" | "trialing", businessIds: string[]) {
  fake = new FakeStripe({
    now: Math.floor(Date.now() / 1000),
    periodStart: Math.floor(Date.now() / 1000) - 10 * 86_400,
    status,
    items: businessIds.map((businessId) => ({ businessId, price: "price_starter" })),
  });
  return fake;
}

describe("plan change actions with a session", () => {
  it("previews an upgrade, then applies it", async () => {
    const seeded = await seedAgency("active", ["Acme Plumbing", "Bay Dental"]);
    session = seeded.client;
    const stripe = useFake("active", seeded.ids);

    const preview = await upgradeBusiness({ businessId: seeded.ids[0], planId: "pro" });
    if (!preview.ok || preview.data.step !== "preview") throw new Error(JSON.stringify(preview));
    expect(preview.data.headline).toMatch(/^You'll pay \$\d+(\.\d\d)? today and get [\d,]+ extra credits now\.$/);

    const done = await upgradeBusiness({ businessId: seeded.ids[0], planId: "pro", previewedAt: preview.data.previewedAt });
    expect(done).toEqual({
      ok: true,
      data: { step: "done", message: "Acme Plumbing is now on Pro. The extra credits appear once the payment goes through." },
    });
    expect(stripe.items.find((i) => i.metadata.business_id === seeded.ids[0])?.price).toBe("price_pro");
  });

  it("refuses bad input and another agency's business", async () => {
    const mine = await seedAgency("active", ["Mine"]);
    const theirs = await seedAgency("active", ["Theirs"]);
    session = mine.client;
    useFake("active", mine.ids);
    expect(await upgradeBusiness({ businessId: "nope", planId: "pro" })).toMatchObject({ ok: false, status: 400 });
    expect(await upgradeBusiness({ businessId: theirs.ids[0], planId: "pro" })).toEqual({
      ok: false,
      status: 404,
      error: "Business not found.",
    });
  });

  it("lets a trial put its second saved business on the plan, but not a third", async () => {
    const two = await seedAgency("trialing", ["First", "Second"]);
    session = two.client;
    useFake("trialing", [two.ids[0]]);
    const second = await addBusiness({ businessId: two.ids[1], planId: "starter" });
    expect(second).toMatchObject({ ok: true, data: { step: "preview", headline: "You pay nothing today. You're still on your free trial." } });

    const three = await seedAgency("trialing", ["One", "Two", "Three"]);
    session = three.client;
    useFake("trialing", three.ids.slice(0, 2));
    expect(await addBusiness({ businessId: three.ids[2], planId: "starter" })).toEqual({
      ok: false,
      status: 403,
      error: "Your trial includes 2 businesses. Upgrade to add more.",
    });
  });
});

