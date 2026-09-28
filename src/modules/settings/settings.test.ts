import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-55 against the local database: every action checks auth, validates input and stays inside the user's agency.
const service = createServiceClient();
const userIds: string[] = [];

async function createAgency() {
  const email = `vitest-settings-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency, error: agencyError } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Settings test", is_test: true })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: "Northside Plumbing", domain: "northside.example", status: "active" })
    .select("id")
    .single();
  if (businessError) throw businessError;
  const { error: promptError } = await service.from("tracked_prompts").insert(
    Array.from({ length: 12 }, (_, i) => ({ business_id: business.id, prompt: `Best plumber ${i}`, active: true })),
  );
  if (promptError) throw promptError;
  return { email, password, agencyId: agency.id, businessId: business.id };
}

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { saveAgencyName, saveBusinessProfile, saveScanSettings, uploadAgencyLogo } = await import("./actions");
const { getSettings } = await import("./dal");

async function signIn({ email, password }: { email: string; password: string }) {
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = client;
}

const profile = (businessId: string) => ({
  businessId,
  name: "Northside Plumbing & Heating",
  industry: "Plumber",
  services: ["Drain cleaning", "Water heaters"],
  city: "Austin",
  region: "TX",
  phone: "(512) 555-0100",
  website: "https://www.Northside-Plumbing.com/contact",
});

beforeEach(() => {
  session = null;
});

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("settings actions", () => {
  it("refuse signed-out callers", async () => {
    const { businessId } = await createAgency();
    expect(await saveBusinessProfile(profile(businessId))).toMatchObject({ ok: false, status: 401 });
    expect(await saveScanSettings({ businessId, models: ["openai"], frequency: "daily" })).toMatchObject({ status: 401 });
    expect(await saveAgencyName({ name: "X" })).toMatchObject({ status: 401 });
    expect(await uploadAgencyLogo(new FormData())).toMatchObject({ status: 401 });
  });

  it("load the page data and save the profile, models and frequency", async () => {
    const seed = await createAgency();
    await signIn(seed);

    const before = await getSettings();
    expect(before.business).toMatchObject({ id: seed.businessId, models: ["openai", "anthropic", "perplexity"], frequency: "weekly" });
    expect(before.activeQuestions).toBe(12);
    expect(before.plan).toEqual({ name: "Starter", monthlyCredits: 1200 });
    expect(before.agency).toEqual({ name: "Settings test", logoUrl: null });

    expect(await saveBusinessProfile(profile(seed.businessId))).toEqual({ ok: true, data: null });
    expect(await saveScanSettings({ businessId: seed.businessId, models: ["perplexity"], frequency: "daily" })).toEqual({
      ok: true,
      data: null,
    });
    expect(await saveAgencyName({ name: "  Blue Door Marketing " })).toEqual({ ok: true, data: null });

    const { data } = await service
      .from("businesses")
      .select("name, industry, services, primary_city, primary_region, phone, domain, models, scan_frequency")
      .eq("id", seed.businessId)
      .single();
    expect(data).toEqual({
      name: "Northside Plumbing & Heating",
      industry: "Plumber",
      services: ["Drain cleaning", "Water heaters"],
      primary_city: "Austin",
      primary_region: "TX",
      phone: "(512) 555-0100",
      domain: "www.northside-plumbing.com",
      models: ["perplexity"],
      scan_frequency: "daily",
    });
    const agency = await service.from("agencies").select("name").eq("id", seed.agencyId).single();
    expect(agency.data?.name).toBe("Blue Door Marketing");
  });

  it("reject bad input", async () => {
    const seed = await createAgency();
    await signIn(seed);
    expect(await saveBusinessProfile({ ...profile(seed.businessId), name: " " })).toMatchObject({ status: 400 });
    expect(await saveBusinessProfile({ ...profile(seed.businessId), website: "not a site" })).toMatchObject({ status: 400 });
    expect(await saveBusinessProfile({ ...profile(seed.businessId), phone: "<script>" })).toMatchObject({ status: 400 });
    expect(await saveScanSettings({ businessId: seed.businessId, models: [], frequency: "weekly" })).toMatchObject({ status: 400 });
    expect(await saveScanSettings({ businessId: seed.businessId, models: ["gemini"], frequency: "weekly" })).toMatchObject({
      status: 400,
    });
    expect(await saveScanSettings({ businessId: seed.businessId, models: ["openai"], frequency: "hourly" })).toMatchObject({
      status: 400,
    });
    expect(await saveAgencyName({ name: "" })).toMatchObject({ status: 400 });
  });

  it("cannot change another agency's business", async () => {
    const other = await createAgency();
    await signIn(await createAgency());
    expect(await saveBusinessProfile(profile(other.businessId))).toMatchObject({ ok: false, status: 404 });
    expect(await saveScanSettings({ businessId: other.businessId, models: ["openai"], frequency: "daily" })).toMatchObject({
      status: 404,
    });
    const { data } = await service.from("businesses").select("name, scan_frequency").eq("id", other.businessId).single();
    expect(data).toEqual({ name: "Northside Plumbing", scan_frequency: "weekly" });
  });

  it("refuses logos that are not PNG, JPG or WebP, or are too big", async () => {
    await signIn(await createAgency());
    const upload = (bytes: Uint8Array, type: string) => {
      const form = new FormData();
      form.append("logo", new File([bytes as BlobPart], "logo.png", { type }));
      return uploadAgencyLogo(form);
    };
    expect(await upload(new TextEncoder().encode("<svg onload=alert(1)>"), "image/png")).toMatchObject({ status: 400 });
    expect(await upload(new TextEncoder().encode("<svg onload=alert(1)>"), "image/svg+xml")).toMatchObject({ status: 400 });
    expect(await upload(new Uint8Array(64).fill(7), "image/png")).toMatchObject({ status: 400 });
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set([0x89, 0x50, 0x4e, 0x47]);
    expect(await upload(big, "image/png")).toMatchObject({ status: 400, error: expect.stringContaining("too big") });
  });
});
