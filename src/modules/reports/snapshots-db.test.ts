import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createOwner, deleteTestUsers, service, tokenOf } from "./reports.test-helpers";

// 7. Reports against the local database: snapshots, their share links and the hidden sections.
vi.hoisted(() => vi.stubEnv("PLACES_FIXTURES", "true"));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let session: SupabaseClient | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { createShareLink, removeSnapshot, revokeShareLink, saveReportSections, saveSnapshot } = await import("./actions");
const { getSharedReport } = await import("./public/dal");

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

beforeEach(() => {
  session = null;
});
afterAll(deleteTestUsers);

describe("snapshots", () => {
  it("need a session", async () => {
    expect(await saveSnapshot({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await saveReportSections({ businessId: randomUUID(), hidden: [] })).toMatchObject({ ok: false, status: 401 });
  });

  it("freeze the report: a snapshot link keeps showing what was saved after the answers change", async () => {
    const owner = await createOwner();
    session = owner.client;
    const saved = await saveSnapshot({ businessId: owner.businessId });
    if (!saved.ok || !saved.data.id) throw new Error("save failed");
    const link = await createShareLink({ businessId: owner.businessId, reportId: saved.data.id });
    const live = await createShareLink({ businessId: owner.businessId });
    if (!link.ok || !live.ok) throw new Error("create failed");
    expect(link.data.path).not.toBe(live.data.path);

    await service.from("visibility_results").update({ business_mentioned: false }).eq("business_id", owner.businessId).throwOnError();
    const frozen = await getSharedReport(tokenOf(link.data.path));
    expect(frozen).toMatchObject({ kind: "snapshot" });
    expect(frozen!.document.summary.score?.value).toBe(67);
    expect((await getSharedReport(tokenOf(live.data.path)))!.document.summary.score?.value).toBe(0);

    // The stored snapshot holds no ids, emails or place ids.
    const { data: row } = await service.from("reports").select("snapshot").eq("id", saved.data.id).single().throwOnError();
    expect(JSON.stringify(row.snapshot)).not.toMatch(UUID);
    expect(JSON.stringify(row.snapshot)).not.toMatch(/@example\.test|ChIJ-/);

    // Turning off the snapshot's link leaves the live link on.
    expect(await revokeShareLink({ id: link.data.id })).toMatchObject({ ok: true });
    expect(await getSharedReport(tokenOf(link.data.path))).toBeNull();
    expect(await getSharedReport(tokenOf(live.data.path))).not.toBeNull();
  });

  it("deleting a snapshot stops its link", async () => {
    const owner = await createOwner();
    session = owner.client;
    const saved = await saveSnapshot({ businessId: owner.businessId });
    if (!saved.ok || !saved.data.id) throw new Error("save failed");
    const link = await createShareLink({ businessId: owner.businessId, reportId: saved.data.id });
    if (!link.ok) throw new Error("create failed");
    expect(await removeSnapshot({ businessId: owner.businessId, reportId: saved.data.id })).toEqual({ ok: true, data: null });
    expect(await getSharedReport(tokenOf(link.data.path))).toBeNull();
  });

  it("refuse another agency's business and snapshot", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = owner.client;
    const saved = await saveSnapshot({ businessId: owner.businessId });
    if (!saved.ok || !saved.data.id) throw new Error("save failed");
    session = other.client;
    expect(await saveSnapshot({ businessId: owner.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await createShareLink({ businessId: other.businessId, reportId: saved.data.id })).toMatchObject({ ok: false, status: 404 });
    expect(await removeSnapshot({ businessId: owner.businessId, reportId: saved.data.id })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("hidden sections", () => {
  it("are saved for the business and left out of the share link", async () => {
    const owner = await createOwner();
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    expect(await saveReportSections({ businessId: owner.businessId, hidden: ["competitors", "summary"] })).toEqual({
      ok: true,
      data: { hidden: ["summary", "competitors"] },
    });
    expect((await getSharedReport(tokenOf(link.data.path)))?.hidden).toEqual(["summary", "competitors"]);
  });

  it("always keep one section on", async () => {
    const owner = await createOwner();
    session = owner.client;
    const all = ["summary", "models", "competitors", "questions", "sources", "actions", "method"];
    expect(await saveReportSections({ businessId: owner.businessId, hidden: all })).toMatchObject({ ok: false, status: 400 });
  });
});
