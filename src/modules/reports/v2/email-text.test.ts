import { describe, expect, it } from "vitest";
import { emailSnapshot, periodText, reportEmailText } from "./email-text";
import { cheeziousSnapshot } from "./fixtures/cheezious";

const LINK = "https://app.example/r/abc";

describe("reportEmailText", () => {
  it("gives the score, the rank, the top 3 fixes with where each is made, and the PDF link, all from the snapshot", () => {
    expect(reportEmailText(emailSnapshot(cheeziousSnapshot), LINK)).toBe(
      [
        "Cheezious: AI visibility report, Sep 29 to Oct 28, 2026",
        "",
        "Visibility score: 15/100, 9 of 60 answers named Cheezious.",
        "Up 2 points on the 30 days before.",
        "Rank: #3 of 5 tracked businesses. Leader: Pizza Hut, 38/100.",
        "",
        "Top 3 fixes:",
        "1. Get cheezious.com used as a source (where: Your website)",
        "2. Complete Google Business Profiles (where: Google Business Profile)",
        "3. Win quality and freshness questions (where: Website, food blogs, TripAdvisor)",
        "",
        `Full report (PDF): ${LINK}`,
      ].join("\n"),
    );
  });

  it("leaves out what the report does not have: no change, no rank, no fixes, no link", () => {
    const quiet = emailSnapshot({ ...cheeziousSnapshot, score: { ...cheeziousSnapshot.score, change: null }, rank: null, fixes: [] });
    const text = reportEmailText(quiet, null);
    expect(text).not.toContain("30 days before");
    expect(text).toContain("Rank: none yet. AI did not name any of the tracked businesses.");
    expect(text).not.toContain("fix");
    expect(text).not.toContain("PDF");
  });

  it("says when you lead, and one fix as one", () => {
    const lead = emailSnapshot({
      ...cheeziousSnapshot,
      rank: { position: 1, of: 5, leader: { name: "Cheezious", score: 15 } },
      fixes: cheeziousSnapshot.fixes.slice(0, 1),
    });
    const text = reportEmailText(lead, LINK);
    expect(text).toContain("Rank: #1 of 5 tracked businesses. You lead the tracked businesses.");
    expect(text).toContain("Top fix:\n1. Get cheezious.com used as a source");
  });

  it("keeps the browser copy small: only the top 3 fixes and their title and where", () => {
    const small = emailSnapshot(cheeziousSnapshot);
    expect(small.fixes).toEqual(cheeziousSnapshot.fixes.slice(0, 3).map(({ n, title, where }) => ({ n, title, where })));
    expect(Object.keys(small).sort()).toEqual(["business", "fixes", "named", "period", "rank", "score"]);
  });
});

describe("periodText", () => {
  it("shows the first year only when the period crosses a new year", () => {
    expect(periodText({ start: "2026-09-29", end: "2026-10-28", days: 30 })).toBe("Sep 29 to Oct 28, 2026");
    expect(periodText({ start: "2025-12-12", end: "2026-01-10", days: 30 })).toBe("Dec 12, 2025 to Jan 10, 2026");
  });
});
