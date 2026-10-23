import { describe, expect, it } from "vitest";
import type { OpportunityDraft } from "../explain";
import { EXPLAIN_WAIT_MS, fallbackMessage, fixesPending, saveFor } from "./service";

const draft = (title: string): OpportunityDraft => ({ title, impact: "medium", category: "content" }) as OpportunityDraft;
const open = (id: string, title: string) => ({ id, title, status: "open" });

describe("saving an explanation's fixes", () => {
  const existing = [open("o1", "Get more Google reviews"), open("o2", "Add your hours to your website"), { id: "d1", title: "List on Yelp", status: "dismissed" }];

  it("lets new AI reasons replace the open fixes, as before", () => {
    const plan = saveFor(existing, { source: "ai", drafts: [draft("Add a services page"), draft("List on Yelp")] });
    expect(plan.insert.map((d) => d.title)).toEqual(["Add a services page"]);
    expect(plan.removeIds).toEqual(["o1", "o2"]);
  });

  it("never removes fixes when the fixed rules stood in, only adds rules not listed yet (Car4Tune, 2026-10-14)", () => {
    const plan = saveFor(existing, { source: "rules", drafts: [draft("AI assistants leave you out of most answers"), draft("get more google reviews")] });
    expect(plan.removeIds).toEqual([]);
    expect(plan.insert.map((d) => d.title)).toEqual(["AI assistants leave you out of most answers"]);
  });

  it("uses the rules in full for a business with no open fixes yet", () => {
    const plan = saveFor([], { source: "rules", drafts: [draft("AI assistants leave you out of most answers")] });
    expect(plan).toEqual({ insert: [draft("AI assistants leave you out of most answers")], removeIds: [] });
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
