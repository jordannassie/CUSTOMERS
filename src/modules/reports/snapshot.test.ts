import { describe, expect, it } from "vitest";
import { parseDocument, type ReportDocument } from "./document";
import { savedReport, shareTarget, snapshotRow, snapshotTitle } from "./snapshot";

const DOC: ReportDocument = {
  version: 1,
  businessName: "Cheezious",
  domain: "cheezious.com",
  place: "Rawalpindi",
  preparedAt: "2026-10-17T09:30:00.000Z",
  windowDays: 30,
  questionCount: 6,
  lastScanAt: "2026-10-17T08:00:00.000Z",
  paused: false,
  summary: {
    headline: "AI recommends Cheezious in about 2 of 10 customer questions",
    score: { value: 15, label: "Good confidence", tone: "low" },
    rank: { position: 3, total: 5, leader: { name: "Pizza Hut", score: 38 } },
    citations: { cited: 0, answers: 60, hasSite: true },
    lines: ["Over the last 30 days, AI recommended Cheezious in about 2 of 10 customer questions."],
  },
  models: { headline: "Claude recommends you most, ChatGPT did not at all", rows: [{ id: "openai", label: "ChatGPT", score: 0, change: null }] },
  competitors: { headline: "Pizza Hut is recommended more often", rows: [], hasReasons: false },
  questions: { headline: "Recommended in 2 of 6 questions", rows: [] },
  sources: { headline: "The sites AI used most in its answers", answers: 60, rows: [] },
  actions: { rows: [] },
};

const BUSINESS = "6f1c2b9e-1111-4a2b-9c3d-123456789abc";

describe("snapshots", () => {
  it("are titled and dated by when they were saved", () => {
    expect(snapshotTitle(new Date("2026-10-17T09:30:00Z"))).toBe("Snapshot Oct 17, 2026");
    expect(snapshotRow(BUSINESS, DOC, ["method"])).toEqual({
      business_id: BUSINESS,
      title: "Snapshot Oct 17, 2026",
      period_start: "2026-09-18",
      period_end: "2026-10-17",
      sections: ["summary", "models", "competitors", "questions", "sources", "actions"],
      snapshot: DOC,
      branding: {},
    });
  });

  it("say the 30 days they cover in the list", () => {
    expect(savedReport({ id: "r1", title: "Snapshot Oct 17, 2026", period_start: "2026-09-18", period_end: "2026-10-17" })).toEqual({
      id: "r1",
      title: "Snapshot Oct 17, 2026",
      detail: "Covers Sep 18 to Oct 17, 2026",
    });
    expect(savedReport({ id: "r2", title: "t", period_start: "2025-12-10", period_end: "2026-01-08" }).detail).toBe("Covers Dec 10, 2025 to Jan 8, 2026");
  });

  it("read back exactly as stored, and drop anything the page does not show", () => {
    expect(parseDocument(JSON.parse(JSON.stringify(DOC)))).toEqual(DOC);
    expect(parseDocument({ ...DOC, ownerEmail: "a@b.test" })).toEqual(DOC);
    expect(parseDocument({ ...DOC, version: 2 })).toBeNull();
    expect(parseDocument({ businessName: "x" })).toBeNull();
  });
});

describe("shareTarget", () => {
  const stored = { business_id: BUSINESS, snapshot: DOC };

  it("opens the live report for a link with no report id", () => {
    expect(shareTarget({ report_id: null }, null, BUSINESS)).toEqual({ kind: "live" });
  });

  it("opens the frozen snapshot for a link with one", () => {
    expect(shareTarget({ report_id: "r1" }, stored, BUSINESS)).toEqual({ kind: "snapshot", doc: DOC });
  });

  it("opens nothing, never the live report, when the snapshot is gone, another business's or unreadable", () => {
    expect(shareTarget({ report_id: "r1" }, null, BUSINESS)).toBeNull();
    expect(shareTarget({ report_id: "r1" }, { ...stored, business_id: "other" }, BUSINESS)).toBeNull();
    expect(shareTarget({ report_id: "r1" }, { ...stored, snapshot: { broken: true } }, BUSINESS)).toBeNull();
  });
});
