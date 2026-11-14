import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createOwner, deleteTestUsers, service, tokenOf } from "./reports.test-helpers";
import { cheeziousSnapshot } from "./v2/fixtures/cheezious";
import type { ReportSnapshot } from "./v2/snapshot-schema";

// D-90, D-92 against the local database: saving version 2 reports, their fixes in Actions, Download PDF, saved
// reports and the agency's branding. The PDF drawing is faked; storage is real.
vi.hoisted(() => vi.stubEnv("PLACES_FIXTURES", "true"));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const render = vi.hoisted(() => ({ calls: 0, logos: [] as (Buffer | null | undefined)[] }));
vi.mock("./v2/pdf/render", () => ({
  renderReportPdf: async (_snapshot: unknown, opts: { logo?: Buffer | null } = {}) => {
    render.calls++;
    render.logos.push(opts.logo);
    return Buffer.from("%PDF-1.4\n% test report\n%%EOF\n");
  },
}));
// A set snapshot stands in for the builder, so the fixes are known; null builds the real one from the saved answers.
const fake = vi.hoisted(() => ({ snapshot: null as ReportSnapshot | null }));
vi.mock("./v2/dal", async (importOriginal) => {
  const real = await importOriginal<typeof import("./v2/dal")>();
  return { loadReportSnapshot: (...args: Parameters<typeof real.loadReportSnapshot>) => (fake.snapshot ? Promise.resolve(fake.snapshot) : real.loadReportSnapshot(...args)) };
});

let session: SupabaseClient | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { createShareLink, exportPdf, removeSnapshot, saveReportBranding, saveSnapshot } = await import("./actions");
const { saveReport, currentReport } = await import("./v2/delivery/dal");
const { reportPdfPath } = await import("./v2/delivery/stored/dal");
const { sharedPdfUrl } = await import("./public/dal");
const { listReports } = await import("./saved/dal");

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

beforeEach(() => {
  session = null;
  fake.snapshot = null;
});
afterAll(deleteTestUsers);

const reportActions = (businessId: string) =>
  service.from("opportunities").select("title, status, source, dedupe_key, category, where_to_apply, recommended_action").eq("business_id", businessId).eq("source", "report").order("dedupe_key").throwOnError();

describe("saveReport", () => {
  it("saves a version 2 report of the saved answers, with no ids, emails or place ids in it", async () => {
    const owner = await createOwner();
    const saved = await saveReport(owner.agencyId, owner.businessId, new Date());
    if (!saved || saved === "empty") throw new Error("save failed");
    expect(saved.snapshot).toMatchObject({ version: 2, business: { name: "Sunrise Coffee Bar" }, score: { value: 67 }, named: { answers: 2, total: 3 } });
    const { data: row } = await service.from("reports").select("title, period_start, period_end, sections, snapshot, pdf_path, saved").eq("id", saved.id).single().throwOnError();
    expect(row).toMatchObject({ title: expect.stringMatching(/^Report [A-Z][a-z]{2} \d{1,2}, \d{4}$/), sections: [], pdf_path: null, saved: false }); // not listed
    expect(row.period_end).toBe(saved.snapshot.period.end);
    expect(JSON.stringify(row.snapshot)).not.toMatch(UUID);
    expect(JSON.stringify(row.snapshot)).not.toMatch(/@example\.test|ChIJ-/);
  });

  it("adds the report's fixes to Actions once, and leaves the ones already there as the owner has them (D-92)", async () => {
    const owner = await createOwner();
    fake.snapshot = cheeziousSnapshot;
    await saveReport(owner.agencyId, owner.businessId, new Date());
    const { data: first } = await reportActions(owner.businessId);
    expect(first).toHaveLength(cheeziousSnapshot.fixes.length);
    expect(first.find((a) => a.dedupe_key === "report:source:google")).toMatchObject({
      title: "Complete Google Business Profiles",
      status: "open",
      category: "local_presence",
      where_to_apply: "Google Business Profile",
      recommended_action: expect.stringMatching(/^1\. Claim and verify/),
    });

    await service.from("opportunities").update({ status: "dismissed" }).eq("business_id", owner.businessId).eq("dedupe_key", "report:source:google").throwOnError();
    await service.from("opportunities").update({ status: "resolved" }).eq("business_id", owner.businessId).eq("dedupe_key", "report:theme:quality").throwOnError();
    await saveReport(owner.agencyId, owner.businessId, new Date());
    const { data: second } = await reportActions(owner.businessId);
    expect(second).toHaveLength(cheeziousSnapshot.fixes.length);
    expect(second.find((a) => a.dedupe_key === "report:source:google")?.status).toBe("dismissed");
    expect(second.find((a) => a.dedupe_key === "report:theme:quality")?.status).toBe("resolved");
    // The scan's own fix is untouched.
    const { data: scan } = await service.from("opportunities").select("id").eq("business_id", owner.businessId).eq("source", "scan").throwOnError();
    expect(scan).toHaveLength(1);
  });

  it("saves nothing for another agency's business or a report with no answers", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    expect(await saveReport(other.agencyId, owner.businessId, new Date())).toBeNull();
    fake.snapshot = { ...cheeziousSnapshot, named: { ...cheeziousSnapshot.named, answers: 0, total: 0 } };
    expect(await saveReport(owner.agencyId, owner.businessId, new Date())).toBe("empty");
    const { data } = await service.from("reports").select("id").eq("business_id", owner.businessId).throwOnError();
    expect(data).toEqual([]);
  });
});

describe("currentReport", () => {
  it("reuses the latest report until a new answer is counted or the branding changes", async () => {
    const owner = await createOwner();
    const first = await currentReport(owner.agencyId, owner.businessId, new Date());
    const again = await currentReport(owner.agencyId, owner.businessId, new Date());
    if (!first || first === "empty" || !again || again === "empty") throw new Error("no report");
    expect(again.id).toBe(first.id);

    const { data: answer } = await service.from("visibility_results").select("run_id, tracked_prompt_id").eq("business_id", owner.businessId).limit(1).single().throwOnError();
    await service
      .from("visibility_results")
      .insert({ ...answer, business_id: owner.businessId, provider: "openai", business_mentioned: true, competitors_mentioned: [], cached: false, answer_text: "new" })
      .throwOnError();
    const afterScan = await currentReport(owner.agencyId, owner.businessId, new Date());
    if (!afterScan || afterScan === "empty") throw new Error("no report");
    expect(afterScan.id).not.toBe(first.id);
    expect(afterScan.snapshot.named.total).toBe(4);

    await service.from("agencies").update({ report_branding: { accent: "#123456" } }).eq("id", owner.agencyId).throwOnError();
    const rebranded = await currentReport(owner.agencyId, owner.businessId, new Date());
    if (!rebranded || rebranded === "empty") throw new Error("no report");
    expect(rebranded.id).not.toBe(afterScan.id);
    expect(rebranded.snapshot.agency.accent).toBe("#123456");
  });

  it("passes over reports in the old layout", async () => {
    const owner = await createOwner();
    await service.from("reports").insert({ business_id: owner.businessId, title: "Snapshot Oct 1, 2026", period_start: "2026-09-02", period_end: "2026-10-01", snapshot: { version: 1 } }).throwOnError();
    const report = await currentReport(owner.agencyId, owner.businessId, new Date());
    expect(report).toMatchObject({ snapshot: { version: 2 } });
  });
});

describe("Download PDF", () => {
  it("needs a session", async () => {
    expect(await exportPdf({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await saveSnapshot({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await saveReportBranding({ accent: "#123456" })).toMatchObject({ ok: false, status: 401 });
  });

  it("stores the PDF once and returns a signed URL that downloads it under a readable name, with the agency logo drawn in", async () => {
    const owner = await createOwner();
    session = owner.client;
    const logo = `agencies/${owner.agencyId}/logo-${randomUUID()}.png`;
    await service.storage.from("business-logos").upload(logo, PNG, { contentType: "image/png" });
    const logoUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${logo}`;
    await service.from("agencies").update({ logo_url: logoUrl }).eq("id", owner.agencyId).throwOnError();

    const before = render.calls;
    const result = await exportPdf({ businessId: owner.businessId });
    if (!result.ok) throw new Error(result.error);
    expect(result.data.fileName).toMatch(/^Sunrise Coffee Bar AI visibility report \d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result.data.url).toContain(`/storage/v1/object/sign/reports/${owner.businessId}/`);
    expect(new URL(result.data.url).searchParams.get("download")).toBe(result.data.fileName);
    const file = await fetch(result.data.url);
    expect(file.headers.get("content-disposition")).toContain("attachment");
    expect((await file.text()).startsWith("%PDF-")).toBe(true);
    expect(render.logos.at(-1)?.equals(PNG)).toBe(true);

    // The same report again: the stored file, not a new drawing.
    expect(await exportPdf({ businessId: owner.businessId })).toMatchObject({ ok: true });
    expect(render.calls - before).toBe(1);
    await service.storage.from("business-logos").remove([logo]);
  });

  it("explains that a saved report in the old layout has no PDF", async () => {
    const owner = await createOwner();
    session = owner.client;
    const { data: old } = await service
      .from("reports")
      .insert({ business_id: owner.businessId, title: "Snapshot Oct 1, 2026", period_start: "2026-09-02", period_end: "2026-10-01", snapshot: { version: 1 } })
      .select("id")
      .single()
      .throwOnError();
    const error = "This saved report uses the old layout. Save a new snapshot to download it as a PDF.";
    expect(await exportPdf({ businessId: owner.businessId, reportId: old.id })).toEqual({ ok: false, status: 409, error });
    expect(await reportPdfPath(owner.businessId, old.id)).toBe("old");
    // Its share link opens nothing.
    const link = await createShareLink({ businessId: owner.businessId, reportId: old.id });
    if (!link.ok) throw new Error("create failed");
    expect(await sharedPdfUrl(tokenOf(link.data.path))).toBeNull();
  });

  it("refuses another agency's business and report", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = owner.client;
    const saved = await saveSnapshot({ businessId: owner.businessId });
    if (!saved.ok) throw new Error("save failed");
    session = other.client;
    expect(await exportPdf({ businessId: owner.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await exportPdf({ businessId: other.businessId, reportId: saved.data.id })).toMatchObject({ ok: false, status: 404 });
    expect(await saveSnapshot({ businessId: owner.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await createShareLink({ businessId: other.businessId, reportId: saved.data.id })).toMatchObject({ ok: false, status: 404 });
    expect(await removeSnapshot({ businessId: owner.businessId, reportId: saved.data.id })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("snapshots", () => {
  it("keep their numbers: a snapshot link opens the same PDF after the answers change, the live link a new one", async () => {
    const owner = await createOwner();
    session = owner.client;
    const saved = await saveSnapshot({ businessId: owner.businessId });
    if (!saved.ok) throw new Error("save failed");
    expect(saved.data).toMatchObject({ title: expect.stringMatching(/^Report /), detail: expect.stringMatching(/^Covers /), old: false });
    const frozen = await createShareLink({ businessId: owner.businessId, reportId: saved.data.id });
    const live = await createShareLink({ businessId: owner.businessId });
    if (!frozen.ok || !live.ok) throw new Error("create failed");
    expect(frozen.data.path).not.toBe(live.data.path);

    await service.from("visibility_results").update({ business_mentioned: false, created_at: new Date().toISOString() }).eq("business_id", owner.businessId).throwOnError();
    expect(await sharedPdfUrl(tokenOf(frozen.data.path))).toContain(`/${saved.data.id}.pdf`);
    expect(await sharedPdfUrl(tokenOf(live.data.path))).not.toContain(`/${saved.data.id}.pdf`);
    // Only the kept snapshot is listed, not the report saved automatically for the live link.
    expect((await listReports(owner.businessId)).map((r) => r.id)).toEqual([saved.data.id]);
  });

  it("deleting one stops its link and removes its PDF", async () => {
    const owner = await createOwner();
    session = owner.client;
    const saved = await saveSnapshot({ businessId: owner.businessId });
    if (!saved.ok) throw new Error("save failed");
    const link = await createShareLink({ businessId: owner.businessId, reportId: saved.data.id });
    if (!link.ok) throw new Error("create failed");
    const path = await reportPdfPath(owner.businessId, saved.data.id);
    expect(path).toBe(`${owner.businessId}/${saved.data.id}.pdf`);

    expect(await removeSnapshot({ businessId: owner.businessId, reportId: saved.data.id })).toEqual({ ok: true, data: null });
    expect(await sharedPdfUrl(tokenOf(link.data.path))).toBeNull();
    expect((await service.storage.from("reports").download(path as string)).error).not.toBeNull();
  });
});

describe("report branding", () => {
  it("checks each field and saves only what is set", async () => {
    const owner = await createOwner();
    session = owner.client;
    expect(await saveReportBranding({ accent: "blue", contactEmail: "", bookingUrl: "" })).toMatchObject({ ok: false, status: 400, error: "Use a colour like #1F4FD1." });
    expect(await saveReportBranding({ accent: "#1F4FD1", contactEmail: "not an email", bookingUrl: "" })).toMatchObject({ ok: false, status: 400 });
    const http = await saveReportBranding({ accent: "#1F4FD1", contactEmail: "", bookingUrl: "http://agency.example/book" });
    expect(http).toMatchObject({ ok: false, status: 400, error: "Enter a link that starts with https://." });

    expect(await saveReportBranding({ accent: " #a1b2c3 ", contactEmail: "hello@agency.example", bookingUrl: "https://agency.example/book" })).toMatchObject({ ok: true });
    const read = () => service.from("agencies").select("report_branding").eq("id", owner.agencyId).single().throwOnError();
    expect((await read()).data.report_branding).toEqual({ accent: "#a1b2c3", contactEmail: "hello@agency.example", bookingUrl: "https://agency.example/book" });

    expect(await saveReportBranding({ accent: "", contactEmail: "", bookingUrl: "" })).toMatchObject({ ok: true });
    expect((await read()).data.report_branding).toEqual({});
  });
});
