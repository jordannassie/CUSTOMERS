import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { BLOCKED_PAGES, COFFEE_PLACE, fakeClients } from "../fixtures";

// 2026-10-16, bennucoffee.com: a website that turns readers away, against the local database. "Try again" runs
// auto-fill once more for the same draft, and the listing picked from Google is saved for a website draft too.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { confirmBusinessPlace } = await import("../actions");
const { saveAgency, startBusiness } = await import("./dal");

const DOMAIN = `bennu-${randomUUID().slice(0, 8)}coffee.example`;

async function signUp() {
  const email = `vitest-blocked-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  await saveAgency(data.user.id, "Blocked Site Agency", null);
  return data.user.id;
}

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("a website that blocks readers", () => {
  it("Try again runs auto-fill once more; sending the same website without it does not", async () => {
    const userId = await signUp();
    const down = fakeClients({ pages: BLOCKED_PAGES, places: new Error("fetch failed") });
    const first = await startBusiness(userId, { domain: DOMAIN }, down.clients);
    if (!first.ok) throw new Error("website step failed");
    expect(first.autofill).toMatchObject({ retry: true });

    const again = fakeClients({ pages: BLOCKED_PAGES, places: new Error("fetch failed") });
    expect(await startBusiness(userId, { domain: DOMAIN }, again.clients)).toMatchObject({ ok: true, autofill: null });
    expect(again.calls.scrape).toEqual([]);

    const listing = { ...COFFEE_PLACE, placeId: `ChIJ-blocked-${randomUUID().slice(0, 8)}`, name: "Bennu Coffee", websiteUri: null };
    const retry = fakeClients({ pages: BLOCKED_PAGES, places: { [DOMAIN]: [listing] } });
    const retried = await startBusiness(userId, { domain: DOMAIN }, retry.clients, null, null, true);
    expect(retried).toMatchObject({ ok: true, businessId: first.businessId });
    if (!retried.ok || !retried.autofill) throw new Error("retry did not run auto-fill");
    expect(retried.autofill.choices?.map((c) => c.placeId)).toEqual([listing.placeId]);

    // The picked listing is saved for this website draft, as with no website (D-73: only its place_id).
    expect(await confirmBusinessPlace({ businessId: first.businessId, placeId: listing.placeId })).toEqual({ ok: true, data: null });
    const { data } = await service.from("businesses").select("places_id, has_website").eq("id", first.businessId).single().throwOnError();
    expect(data).toEqual({ places_id: listing.placeId, has_website: true });
  });
});
