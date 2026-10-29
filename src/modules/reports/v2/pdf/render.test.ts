import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { reportSnapshotSchema, type ReportSnapshot } from "../snapshot-schema";
import { cheeziousSnapshot } from "../fixtures/cheezious";
import { balancedWidth, expectedLayout } from "./layout";
import { renderReport, renderReportPdf } from "./render";

// Draws the real PDF and reads it back with pdf.js: page count, where each section lands and the numbers on each page.
// Set REPORT_PDF_OUT=/some/file.pdf to keep the full fixture's PDF for a look.

const SLOW = 60_000;
// A test-only switch, not app config, so it is read from Vitest's import.meta.env rather than src/lib/env.ts.
const PDF_OUT = (import.meta.env as unknown as Record<string, string | undefined>).REPORT_PDF_OUT;

async function readPdf(pdf: Buffer): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: false, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text.replace(/\s+/g, " "));
  }
  await doc.destroy();
  return pages;
}

const squash = (text: string) => text.replace(/\s/g, "");
const clone = (): ReportSnapshot => structuredClone(cheeziousSnapshot);

describe("renderReportPdf, full fixture", () => {
  it("draws exactly 10 pages with every number from the snapshot", { timeout: SLOW }, async () => {
    expect(reportSnapshotSchema.safeParse(cheeziousSnapshot).success).toBe(true);
    const result = await renderReport(cheeziousSnapshot);
    if (PDF_OUT) writeFileSync(PDF_OUT, result.pdf);

    expect(result.pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.expectedTotal).toBe(10);
    expect(result.redrawn).toBe(false);
    expect(result.pages).toEqual({ summary: 2, knows: 3, behind: 4, plan: 5, roadmap: 9, method: 10 });

    const pages = await readPdf(result.pdf);
    expect(pages).toHaveLength(10);
    const all = pages.join(" ");

    // Cover: no header or footer, contents with computed page numbers.
    // Letter-spaced labels come back one letter at a time.
    expect(squash(pages[0])).toContain("AIVISIBILITYREPORT");
    expect(squash(pages[1])).toContain("01·SUMMARY");
    expect(squash(pages[9])).toContain("06·METHODANDGLOSSARY");
    expect(pages[0]).toContain("Cheezious, cheezious.com");
    expect(pages[0]).toContain("10 questions, 3 AI engines, 60 answers");
    expect(pages[0]).toContain("Rank among 5 tracked");
    expect(pages[0]).toMatch(/5\. 90 day roadmap 9/);
    expect(pages[0]).toMatch(/6\. Method and glossary 10/);
    expect(pages[0]).not.toContain("Page 1 of");

    // Summary numbers.
    expect(pages[1]).toContain("9 of 60 answers");
    expect(pages[1]).toContain("In 6 of 10 questions");
    expect(pages[1]).toContain("Up 2 vs previous 30 days");
    expect(pages[1]).toContain("#3");
    expect(pages[1]).toContain("Leader: Pizza Hut, 38");
    expect(pages[1]).toMatch(/0 times/);
    expect(pages[1]).toContain("All 6 fixes start on page 5");

    // Header and footer on every page but the cover.
    for (let i = 1; i < 10; i++) {
      expect(pages[i]).toContain(`Page ${i + 1} of 10`);
      expect(pages[i]).toContain("Prepared by Brightline Digital");
      expect(pages[i]).toContain("AI visibility report · Sep 29 to Oct 28, 2026");
    }
    for (const i of [5, 6, 7]) expect(pages[i]).toContain("Action plan, continued");
    expect(pages[4]).not.toContain("Action plan, continued");

    // Each fix title appears, and the fix cards sit two to a page without splitting.
    for (const fix of cheeziousSnapshot.fixes) expect(all).toContain(fix.title);
    const fixes = cheeziousSnapshot.fixes;
    expect(pages[5]).toContain(fixes[0].goal.text);
    // Nothing in the normal fixture is cut short to make the cards fit.
    expect(all).not.toContain("…");
    for (const step of fixes.flatMap((f) => f.steps)) expect(all).toContain(step.slice(-18));
    expect(pages[5]).toContain(fixes[1].goal.text);
    expect(pages[6]).toContain(fixes[2].title);
    expect(pages[6]).toContain(fixes[3].goal.text);
    expect(pages[7]).toContain(fixes[4].title);
    expect(pages[7]).toContain(fixes[5].goal.text);

    // Problem lines say so in words.
    expect(pages[2]).toContain("Fix 5");
    expect(pages[3]).toContain("You:");
    expect(pages[3]).toContain("Fixed by #3 and #5");
    expect(pages[4]).toContain("Fixes 1, 3, 5");
    expect(pages[4]).toContain("Critical");

    // Method page: score range, limits and contact.
    expect(pages[9]).toContain("plus or minus 4 points");
    expect(pages[9]).toContain("No one can promise AI recommendations");
    expect(pages[9]).toContain("hello@brightline.example");
    expect(pages[9]).toContain("brightline.example/book");
  });

  it("returns the same PDF bytes shape from the public function", { timeout: SLOW }, async () => {
    const pdf = await renderReportPdf(cheeziousSnapshot, { logo: null });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect((await readPdf(pdf)).length).toBe(10);
  });
});

describe("renderReportPdf, other snapshots", () => {
  it("draws fewer fix pages for fewer fixes and numbers the contents to match", { timeout: SLOW }, async () => {
    const snap = clone();
    snap.fixes = snap.fixes.slice(0, 3);
    expect(expectedLayout(snap)).toEqual({
      pages: { summary: 2, knows: 3, behind: 4, plan: 5, roadmap: 8, method: 9 },
      total: 9,
    });
    const result = await renderReport(snap);
    const pages = await readPdf(result.pdf);
    expect(pages).toHaveLength(9);
    expect(result.redrawn).toBe(false);
    expect(pages[0]).toMatch(/5\. 90 day roadmap 8/);
    expect(pages[1]).toContain("The fixes start on page 5");
    expect(pages[8]).toContain("Page 9 of 9");
  });

  it("keeps the page count when every long field is far longer than usual", { timeout: SLOW }, async () => {
    const long = (n: number) => "Answers named other places with far more detail than yours ".repeat(n).trim();
    const snap = clone();
    snap.summary.headline = long(3);
    snap.summary.lead = long(8);
    snap.summary.short = { knows: long(6), behind: long(6), fixes: long(6) };
    snap.knows.gaps = snap.knows.gaps.map((g) => ({ ...g, title: long(2), evidence: long(4) }));
    snap.knows.excerpts.named!.text = long(10);
    snap.behind.reasons = snap.behind.reasons.map((r) => ({ ...r, title: long(2), them: long(4), you: long(4) }));
    snap.behind.wins = long(10);
    snap.fixes = snap.fixes.map((f) => ({
      ...f,
      title: long(2),
      where: long(1),
      owner: "Web developer and marketing lead",
      evidence: long(8),
      why: long(6),
      steps: [long(3), long(3), long(3), long(3)],
      goal: { ...f.goal, text: long(3) },
    }));
    snap.areas = [...snap.areas, ...snap.areas.slice(0, 2)].map((a) => ({ ...a, label: long(1), text: long(5) }));
    snap.business.name = "The Original Cheezious Pizza and Grill House";
    snap.agency.name = long(2);
    snap.roadmap.columns = snap.roadmap.columns.map((c) => ({
      ...c,
      title: long(1),
      goal: long(3),
      tasks: [1, 2, 3, 4].map(() => ({ label: long(2), area: long(1) })),
    }));
    snap.method.text = long(14);
    const result = await renderReport(snap);
    if (PDF_OUT) writeFileSync(PDF_OUT.replace(/\.pdf$/, "-long.pdf"), result.pdf);
    const pages = await readPdf(result.pdf);
    expect(result.redrawn).toBe(false);
    expect(pages).toHaveLength(10);
  });

  it("draws a report with missing optional data", { timeout: SLOW }, async () => {
    const snap = clone();
    snap.rank = null;
    snap.score = { value: 0, change: null, rangePoints: null };
    snap.named = { ...snap.named, answers: 0, questions: 0 };
    snap.knows.knownFor = null;
    snap.knows.excerpts = { named: null, competitor: null };
    snap.behind.wins = null;
    snap.roadmap.nextScanAt = null;
    snap.agency = { ...snap.agency, contactEmail: null, bookingUrl: null, accent: "not a colour" };
    snap.business.domain = null;
    const pages = await readPdf(await renderReportPdf(snap));
    expect(pages).toHaveLength(10);
    expect(pages[1]).toContain("No clear change on the 30 days before");
    expect(pages[2]).toContain("No answer named you in this period.");
    expect(pages[8]).toContain("Not booked yet");
    expect(pages[9]).toContain("Not measured for this scan.");
    expect(pages[9]).toContain("Ask Brightline Digital about any number in this report.");
    expect(pages[9]).not.toContain("Book a 20 minute review call");
  });

  it("draws the agency logo when one is given", { timeout: SLOW }, async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const pages = await readPdf(await renderReportPdf(cheeziousSnapshot, { logo: png }));
    expect(pages).toHaveLength(10);
    expect(pages[0]).not.toContain("BD");
  });
});

describe("balancedWidth", () => {
  it("keeps short headlines full width and splits long ones evenly", () => {
    expect(balancedWidth("Six fixes, ranked by impact", 516)).toBe(516);
    const width = balancedWidth("AI named Cheezious in 9 of 60 answers. Pizza Hut was named in 23.", 516);
    expect(width).toBeLessThan(400);
    expect(width).toBeGreaterThan(330);
  });
});
