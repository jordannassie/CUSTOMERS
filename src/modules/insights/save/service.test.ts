import { describe, expect, it } from "vitest";
import type { OpportunityDraft } from "../explain";
import { EXPLAIN_WAIT_MS, fallbackMessage, fixesPending, saveFor } from "./service";

const draft = (title: string): OpportunityDraft => ({ title, impact: "medium", category: "content" }) as OpportunityDraft;
const open = (id: string, title: string, source = "scan") => ({ id, title, status: "open", source, affected_url: null });

describe("saving an explanation's fixes", () => {
  const existing = [
    open("o1", "Get more Google reviews"),
    open("o2", "Add your hours to your website"),
    { id: "d1", title: "List on Yelp", status: "dismissed", source: "scan", affected_url: null },
  ];

  it("rewrites a fix the AI suggests again in place, adds new ones and removes the open ones it no longer suggests", () => {
    const plan = saveFor(existing, { source: "ai", drafts: [draft("Add a services page"), draft("List on Yelp"), draft("get more google reviews")] });
    expect(plan.insert.map((d) => d.title)).toEqual(["Add a services page"]);
    expect(plan.update).toEqual([{ id: "o1", draft: draft("get more google reviews") }]);
    expect(plan.removeIds).toEqual(["o2"]);
  });

  it("never removes or rewrites fixes when the fixed rules stood in, only adds rules not listed yet (Car4Tune, 2026-10-14)", () => {
    const plan = saveFor(existing, { source: "rules", drafts: [draft("AI assistants leave you out of most answers"), draft("get more google reviews")] });
    expect(plan.removeIds).toEqual([]);
    expect(plan.update).toEqual([]);
    expect(plan.insert.map((d) => d.title)).toEqual(["AI assistants leave you out of most answers"]);
  });

  it("uses the rules in full for a business with no open fixes yet", () => {
    const plan = saveFor([], { source: "rules", drafts: [draft("AI assistants leave you out of most answers")] });
    expect(plan).toEqual({ insert: [draft("AI assistants leave you out of most answers")], update: [], removeIds: [] });
  });

  it("keeps an open fix added from Compare: not rewritten, not added again, not removed", () => {
    const plan = saveFor([open("c1", "List on Yelp", "comparison")], { source: "ai", drafts: [draft("List on Yelp")] });
    expect(plan).toEqual({ insert: [], update: [], removeIds: [] });
  });

  it("matches a stored title the writer reworded ('sample questions' is saved as 'questions we track')", () => {
    const plan = saveFor([open("o1", "Named in all 6 of the questions we track")], { source: "ai", drafts: [draft("Named in all 6 of the sample questions we tracked")] });
    expect(plan.update.map((u) => u.id)).toEqual(["o1"]);
    expect(plan.insert).toEqual([]);
    expect(plan.removeIds).toEqual([]);
  });

  it("does not add again a fix the user accepted (To do), nor rewrite it", () => {
    const plan = saveFor([{ ...open("t1", "Add an FAQ"), status: "todo" }], { source: "ai", drafts: [draft("Add an FAQ")] });
    expect(plan).toEqual({ insert: [], update: [], removeIds: [] });
  });

  it("keeps a ticked checklist item and does not add its title again", () => {
    const ticked = { id: "k1", title: "Get your first 10 reviews", status: "resolved", source: "scan", affected_url: "checklist:reviews" };
    expect(saveFor([ticked], { source: "ai", drafts: [draft("Get your first 10 reviews")] })).toEqual({ insert: [], update: [], removeIds: [] });
    expect(saveFor([{ ...ticked, status: "open" }], { source: "ai", drafts: [draft("Get your first 10 reviews")] })).toEqual({ insert: [], update: [], removeIds: [] });
  });
});

describe("logging a fallback", () => {
  it("says why the rules stood in and which reasons were dropped", () => {
    expect(
      fallbackMessage({ source: "rules", fallbackReason: "only 1 of 4 reasons passed the checks", dropped: [{ title: "Bean House has a menu page", issues: ["page claim"] }] }),
    ).toBe('Why competitors win fell back to the fixed rules: only 1 of 4 reasons passed the checks. Dropped: "Bean House has a menu page" (page claim)');
    expect(fallbackMessage({ source: "rules", fallbackReason: "writer failed: 529", dropped: [] })).toBe("Why competitors win fell back to the fixed rules: writer failed: 529");
  });

  it("logs nothing when the AI wrote the fixes or there was nothing to explain", () => {
    expect(fallbackMessage({ source: "ai", fallbackReason: null, dropped: [] })).toBeNull();
    expect(fallbackMessage({ source: "rules", fallbackReason: "the scan has no saved answers", dropped: [] })).toBeNull();
  });
});

describe("fixes on their way", () => {
  const now = new Date("2026-10-14T13:38:00Z");
  it("is pending only between a finished scan and its explanation, for a few minutes at most", () => {
    expect(fixesPending({ completedAt: "2026-10-14T13:37:33Z", explainedAt: null }, now)).toBe(true);
    expect(fixesPending({ completedAt: "2026-10-14T13:37:33Z", explainedAt: "2026-10-14T13:39:43Z" }, now)).toBe(false);
    expect(fixesPending({ completedAt: new Date(now.getTime() - EXPLAIN_WAIT_MS - 1).toISOString(), explainedAt: null }, now)).toBe(false);
    expect(fixesPending(null, now)).toBe(false);
  });
});
