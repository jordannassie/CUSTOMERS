import { afterAll, describe, expect, it, vi } from "vitest";
import { createOwner, deleteTestUsers, service } from "./reports.test-helpers";
import { cheeziousSnapshot } from "./v2/fixtures/cheezious";

// A stored PDF drawn with an older layout is drawn again from the report's frozen snapshot (PDF_LAYOUT_VERSION,
// 2026-11-16: text is no longer cut short with "…"). The drawing is faked; the database and storage are real.
vi.mock("./v2/pdf/render", () => ({ renderReportPdf: async () => Buffer.from("%PDF-1.4\n% test report\n%%EOF\n") }));
const { reportPdfPath } = await import("./v2/delivery/stored/dal");

afterAll(deleteTestUsers);

describe("stored report PDFs", () => {
  it("draws a PDF stored with an older layout again, and keeps the new one", async () => {
    const owner = await createOwner();
    const { data: report } = await service
      .from("reports")
      .insert({ business_id: owner.businessId, title: "Old layout", period_start: "2026-10-01", period_end: "2026-10-30", snapshot: cheeziousSnapshot, pdf_path: `${owner.businessId}/old.pdf` })
      .select("id")
      .single()
      .throwOnError();

    const path = await reportPdfPath(owner.businessId, report.id);
    expect(path).toBe(`${owner.businessId}/${report.id}-v2.pdf`);
    const { data: row } = await service.from("reports").select("pdf_path").eq("id", report.id).single().throwOnError();
    expect(row.pdf_path).toBe(path);
    expect((await service.storage.from("reports").download(path as string)).error).toBeNull();
    // Opened again: the stored file is used as it is.
    expect(await reportPdfPath(owner.businessId, report.id)).toBe(path);
  });
});
