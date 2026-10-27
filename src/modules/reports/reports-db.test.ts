import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createOwner, deleteTestUsers, service, tokenOf } from "./reports.test-helpers";

// B-59 against the local database: creating and turning off share links, and what the public report holds.
// Google values from the made-up fixtures, never a real Places call (D-73).
vi.hoisted(() => vi.stubEnv("PLACES_FIXTURES", "true"));

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { createShareLink, revokeShareLink } = await import("./actions");
const { getSharedReport, isShareLinkActive } = await import("./public/dal");

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

beforeEach(() => {
  session = null;
});
afterAll(deleteTestUsers);

describe("share links", () => {
  it("need a session", async () => {
    expect(await createShareLink({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await revokeShareLink({ id: randomUUID() })).toMatchObject({ ok: false, status: 401 });
  });

  it("creates one long random link, reuses it, and turns it off", async () => {
    const owner = await createOwner();
    session = owner.client;
    const first = await createShareLink({ businessId: owner.businessId });
    const again = await createShareLink({ businessId: owner.businessId });
    if (!first.ok || !again.ok) throw new Error("create failed");
    expect(again.data).toEqual(first.data);
    expect(tokenOf(first.data.path)).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const report = await getSharedReport(tokenOf(first.data.path));
    expect(report).toMatchObject({ kind: "live", hidden: [], agency: { name: "Northside Marketing", hasLogo: false } });
    expect(report!.document.businessName).toBe("Sunrise Coffee Bar");
    expect(report!.document.summary.score?.value).toBe(67);
    expect(report!.document.actions.rows).toMatchObject([{ title: "Add your opening hours to your website", impact: "high" }]);
    expect(report!.document.competitors.rows.map((r) => r.name)).toContain("Bean House");
    // The fixture's live Google values (320 reviews, 4.7 stars) never go into the report (D-73).
    expect(JSON.stringify(report)).not.toMatch(/reviewCount|rating|320 (Google )?reviews|4\.7 stars/i);

    expect(await revokeShareLink({ id: first.data.id })).toEqual({ ok: true, data: null });
    expect(await getSharedReport(tokenOf(first.data.path))).toBeNull();
    const next = await createShareLink({ businessId: owner.businessId });
    if (!next.ok) throw new Error("create failed");
    expect(next.data.path).not.toBe(first.data.path);
  });

  it("stops opening while the agency is suspended or deleted, and opens again when it is reinstated (B9)", async () => {
    const owner = await createOwner();
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    const token = tokenOf(link.data.path);
    const setStatus = (status: string) => service.from("agencies").update({ status }).eq("id", owner.agencyId).throwOnError();

    for (const status of ["suspended", "deleted"]) {
      await setStatus(status);
      expect(await getSharedReport(token), status).toBeNull();
      expect(await isShareLinkActive(token), status).toBe(false);
    }
    await setStatus("active");
    expect(await isShareLinkActive(token)).toBe(true);
    expect(await getSharedReport(token)).not.toBeNull();
  });

  it("puts no database ids, emails or place ids in the report", async () => {
    const owner = await createOwner();
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    const json = JSON.stringify(await getSharedReport(tokenOf(link.data.path)));
    expect(json).not.toMatch(UUID);
    expect(json).not.toMatch(/@example\.test|ChIJ-/);
  });

  it("says test mode on a test agency's share link, and not on a real one's (D-61)", async () => {
    const owner = await createOwner();
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    expect((await getSharedReport(tokenOf(link.data.path)))?.agency.isTest).toBe(true);
    const { data: b } = await service.from("businesses").select("agency_id").eq("id", owner.businessId).single().throwOnError();
    await service.from("agencies").update({ is_test: false }).eq("id", b.agency_id!).throwOnError();
    expect((await getSharedReport(tokenOf(link.data.path)))?.agency.isTest).toBe(false);
  });

  it("refuses another agency's business and link", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = other.client;
    const theirs = await createShareLink({ businessId: other.businessId });
    if (!theirs.ok) throw new Error("create failed");

    session = owner.client;
    expect(await createShareLink({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await revokeShareLink({ id: theirs.data.id })).toMatchObject({ ok: false, status: 404 });
    expect(await getSharedReport(tokenOf(theirs.data.path))).not.toBeNull();
    expect(await createShareLink({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });
  });

  it("turns off every live link for the business, even one made by a racing double click", async () => {
    const owner = await createOwner();
    session = owner.client;
    const stray = "s".repeat(43);
    await service.from("report_shares").insert({ business_id: owner.businessId, token: stray }).throwOnError();
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    expect(await revokeShareLink({ id: link.data.id })).toMatchObject({ ok: true });
    expect(await getSharedReport(stray)).toBeNull();
    expect(await getSharedReport(tokenOf(link.data.path))).toBeNull();
  });

  it("shows nothing for unknown or malformed tokens", async () => {
    expect(await getSharedReport("A".repeat(43))).toBeNull();
    expect(await getSharedReport("' or 1=1 --")).toBeNull();
  });

  it("keeps links out of reach of signed-in users through the API (no public policies)", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    const anon = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    expect((await anon.from("report_shares").select("token")).data ?? []).toEqual([]);
    expect((await other.client.from("report_shares").select("token")).data).toEqual([]);
    const insert = await other.client.from("report_shares").insert({ business_id: owner.businessId, token: "x".repeat(43) });
    expect(insert.error).not.toBeNull();
  });
});
