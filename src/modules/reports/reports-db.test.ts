import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createOwner, deleteTestUsers, service, tokenOf } from "./reports.test-helpers";

// B-59, D-90 against the local database: creating and turning off share links, and the PDF each one opens. The PDF
// drawing is faked (the real one is tested in v2/pdf/render.test.ts), so each open is quick; storage is real.
vi.hoisted(() => vi.stubEnv("PLACES_FIXTURES", "true"));
const render = vi.hoisted(() => ({ calls: 0 }));
vi.mock("./v2/pdf/render", () => ({
  renderReportPdf: async () => {
    render.calls++;
    return Buffer.from("%PDF-1.4\n% test report\n%%EOF\n");
  },
}));

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { createShareLink, revokeShareLink } = await import("./actions");
const { sharedPdfUrl } = await import("./public/dal");

beforeEach(() => {
  session = null;
});
afterAll(deleteTestUsers);

async function linkFor(owner: Awaited<ReturnType<typeof createOwner>>) {
  session = owner.client;
  const link = await createShareLink({ businessId: owner.businessId });
  if (!link.ok) throw new Error("create failed");
  return link.data;
}

describe("share links", () => {
  it("need a session", async () => {
    expect(await createShareLink({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await revokeShareLink({ id: randomUUID() })).toMatchObject({ ok: false, status: 401 });
  });

  it("creates one long random link, reuses it, opens the stored PDF through a fresh signed URL, and turns it off", async () => {
    const owner = await createOwner();
    const first = await linkFor(owner);
    const again = await createShareLink({ businessId: owner.businessId });
    if (!again.ok) throw new Error("create failed");
    expect(again.data).toEqual(first);
    expect(tokenOf(first.path)).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const url = await sharedPdfUrl(tokenOf(first.path));
    expect(url).toMatch(new RegExp(`/storage/v1/object/sign/reports/${owner.businessId}/[0-9a-f-]{36}\\.pdf\\?token=`));
    // Inline: no download file name on a share link.
    expect(url).not.toContain("download=");
    const file = await fetch(url!);
    expect(file.status).toBe(200);
    expect((await file.text()).startsWith("%PDF-")).toBe(true);

    expect(await revokeShareLink({ id: first.id })).toEqual({ ok: true, data: null });
    expect(await sharedPdfUrl(tokenOf(first.path))).toBeNull();
    const next = await createShareLink({ businessId: owner.businessId });
    if (!next.ok) throw new Error("create failed");
    expect(next.data.path).not.toBe(first.path);
  });

  it("draws the live link's report once, then reuses it until a scan changes the numbers", async () => {
    const owner = await createOwner();
    const token = tokenOf((await linkFor(owner)).path);
    const before = render.calls;
    const one = await sharedPdfUrl(token);
    const two = await sharedPdfUrl(token);
    expect(render.calls - before).toBe(1);
    // Signed again on each open, for the same stored file.
    expect(one!.split("?")[0]).toBe(two!.split("?")[0]);
    const { data: rows } = await service.from("reports").select("id, pdf_path").eq("business_id", owner.businessId).throwOnError();
    expect(rows).toHaveLength(1);
    expect(rows[0].pdf_path).toBe(`${owner.businessId}/${rows[0].id}.pdf`);
  });

  it("stops opening while the agency is suspended or deleted, and opens again when it is reinstated (B9)", async () => {
    const owner = await createOwner();
    const token = tokenOf((await linkFor(owner)).path);
    const setStatus = (status: string) => service.from("agencies").update({ status }).eq("id", owner.agencyId).throwOnError();

    for (const status of ["suspended", "deleted"]) {
      await setStatus(status);
      expect(await sharedPdfUrl(token), status).toBeNull();
    }
    await setStatus("active");
    expect(await sharedPdfUrl(token)).not.toBeNull();
  });

  it("refuses another agency's business and link", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    const theirs = await linkFor(other);

    session = owner.client;
    expect(await createShareLink({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await revokeShareLink({ id: theirs.id })).toMatchObject({ ok: false, status: 404 });
    expect(await sharedPdfUrl(tokenOf(theirs.path))).not.toBeNull();
    expect(await createShareLink({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });
  });

  it("turns off every live link for the business, even one made by a racing double click", async () => {
    const owner = await createOwner();
    const stray = "s".repeat(43);
    await service.from("report_shares").insert({ business_id: owner.businessId, token: stray }).throwOnError();
    const link = await linkFor(owner);
    expect(await revokeShareLink({ id: link.id })).toMatchObject({ ok: true });
    expect(await sharedPdfUrl(stray)).toBeNull();
    expect(await sharedPdfUrl(tokenOf(link.path))).toBeNull();
  });

  it("closes an old PDF export link (for_pdf, from before D-90) after a few minutes", async () => {
    const owner = await createOwner();
    const token = "p".repeat(43);
    await service
      .from("report_shares")
      .insert({ business_id: owner.businessId, token, for_pdf: true, created_at: new Date(Date.now() - 10 * 60_000).toISOString() })
      .throwOnError();
    expect(await sharedPdfUrl(token)).toBeNull();
  });

  it("opens nothing for unknown or malformed tokens, or a business with no answers yet", async () => {
    expect(await sharedPdfUrl("A".repeat(43))).toBeNull();
    expect(await sharedPdfUrl("' or 1=1 --")).toBeNull();
    const owner = await createOwner();
    await service.from("visibility_results").delete().eq("business_id", owner.businessId).throwOnError();
    expect(await sharedPdfUrl(tokenOf((await linkFor(owner)).path))).toBeNull();
  });

  it("keeps links and PDFs out of reach of signed-in users through the API (no public policies)", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    const link = await linkFor(owner);
    const url = await sharedPdfUrl(tokenOf(link.path));
    const anon = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    expect((await anon.from("report_shares").select("token")).data ?? []).toEqual([]);
    expect((await other.client.from("report_shares").select("token")).data).toEqual([]);
    const insert = await other.client.from("report_shares").insert({ business_id: owner.businessId, token: "x".repeat(43) });
    expect(insert.error).not.toBeNull();
    // The bucket is private: the file opens only through a signed URL.
    const path = new URL(url!).pathname.replace(/^.*\/object\/sign\/reports\//, "");
    expect((await anon.storage.from("reports").download(path)).error).not.toBeNull();
    expect((await other.client.storage.from("reports").download(path)).error).not.toBeNull();
  });
});
