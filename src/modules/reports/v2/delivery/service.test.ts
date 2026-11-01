import { describe, expect, it } from "vitest";
import { cheeziousSnapshot } from "../fixtures/cheezious";
import type { ReportFix } from "../snapshot-schema";
import { fixActionRow, fixCategory, fixDedupeKey, numberedSteps, pdfFileName, pdfStoragePath, reportRow, reportTitle } from "./service";

const BUSINESS = "7f3c2a9e-2d4b-4c1a-9a6e-1b2c3d4e5f60";
const [first, second, third, fourth] = cheeziousSnapshot.fixes;

describe("fixActionRow (D-92)", () => {
  it("adds a report fix to Actions as a suggestion, with its why, evidence, numbered steps and where", () => {
    expect(fixActionRow(BUSINESS, second)).toEqual({
      business_id: BUSINESS,
      title: "Complete Google Business Profiles",
      description: second.why,
      evidence: second.evidence,
      recommended_action: [
        "1. Claim and verify a Google Business Profile for every Rawalpindi branch.",
        "2. Set categories to pizza restaurant and pizza delivery, add hours, menu link, order link and real photos.",
        "3. Reply to recent reviews and ask happy customers to mention what they ordered and how fast it came.",
      ].join("\n"),
      impact: "high",
      category: "local_presence",
      where_to_apply: "Google Business Profile",
      status: "open",
      source: "report",
      dedupe_key: "report:source:google",
    });
  });

  it("maps the first area to a category the opportunities table allows", () => {
    expect(fixCategory(first)).toBe("service_page");
    expect(fixCategory(second)).toBe("local_presence");
    // Website first, then blogs and reviews: the first area decides.
    expect(fixCategory(third)).toBe("service_page");
    expect(fixCategory({ areas: ["reviews", "website"] })).toBe("reviews_reputation");
    expect(fixCategory(fourth)).toBe("citations");
    for (const area of ["blogs", "social", "directories", "other"] as const) expect(fixCategory({ areas: [area] })).toBe("citations");
  });

  it("keys a fix by its issue, so the same issue in the next report finds the row already there", () => {
    expect(fixDedupeKey(first)).toBe("report:own_site_uncited");
    const reworded: ReportFix = { ...first, title: "Reworded by AI" };
    expect(fixDedupeKey(reworded)).toBe(fixDedupeKey(first));
  });

  it("numbers the steps the way the Actions board splits them back", () => {
    expect(numberedSteps(["Do this.", "Then that."])).toBe("1. Do this.\n2. Then that.");
  });

  it("keeps where_to_apply within the column's 200 characters", () => {
    const long: ReportFix = { ...first, where: "x".repeat(300) };
    expect(fixActionRow(BUSINESS, long).where_to_apply).toHaveLength(200);
  });
});

describe("the saved report", () => {
  it("is titled by its UTC date and covers the snapshot's period, with no hidden sections", () => {
    const now = new Date("2026-10-28T23:30:00Z");
    expect(reportTitle(now)).toBe("Report Oct 28, 2026");
    expect(reportRow(BUSINESS, cheeziousSnapshot, now)).toMatchObject({
      business_id: BUSINESS,
      title: "Report Oct 28, 2026",
      period_start: "2026-09-29",
      period_end: "2026-10-28",
      sections: [],
      branding: {},
      saved: false,
    });
    expect(reportRow(BUSINESS, cheeziousSnapshot, now, true)).toMatchObject({ saved: true });
  });

  it("stores its PDF under the business, by report id", () => {
    expect(pdfStoragePath(BUSINESS, "r1")).toBe(`${BUSINESS}/r1.pdf`);
  });

  it("downloads under a readable name with the report's date", () => {
    expect(pdfFileName("Cheezious", "2026-10-28T10:00:00.000Z")).toBe("Cheezious AI visibility report 2026-10-28.pdf");
    expect(pdfFileName('Joe\'s Plumbing / Heating: "24h"', "2026-10-28")).toBe("Joe's Plumbing Heating 24h AI visibility report 2026-10-28.pdf");
    expect(pdfFileName("///", "2026-10-28")).toBe("Business AI visibility report 2026-10-28.pdf");
  });
});
