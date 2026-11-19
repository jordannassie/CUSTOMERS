import { afterAll, describe, expect, it, vi } from "vitest";
import { createOwner, deleteTestUsers, service } from "./reports.test-helpers";

// BUG-319 against the local database: the live report is saved again once a competitor is tracked, so it never says
// "no business you track was named" while the Overview shows the new one ahead. The PDF drawing is faked.
vi.hoisted(() => vi.stubEnv("PLACES_FIXTURES", "true"));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("./v2/pdf/render", () => ({ renderReportPdf: async () => Buffer.from("%PDF-1.4\n% test report\n%%EOF\n") }));

const { currentReport } = await import("./v2/delivery/dal");

afterAll(deleteTestUsers);

describe("currentReport after a competitor is tracked", () => {
  it("saves a new report, then reuses it until something changes again", async () => {
    const owner = await createOwner();
    const first = await currentReport(owner.agencyId, owner.businessId, new Date());
    if (!first || first === "empty") throw new Error("no report");

    await service.from("business_competitors").insert({ business_id: owner.businessId, name: "Newly Tracked Cafe", confirmed: true }).throwOnError();
    const after = await currentReport(owner.agencyId, owner.businessId, new Date());
    if (!after || after === "empty") throw new Error("no report");
    expect(after.id).not.toBe(first.id);

    const again = await currentReport(owner.agencyId, owner.businessId, new Date());
    if (!again || again === "empty") throw new Error("no report");
    expect(again.id).toBe(after.id);
  });
});
