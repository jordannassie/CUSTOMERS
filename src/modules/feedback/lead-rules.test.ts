import { describe, expect, it } from "vitest";
import { leadStage, leadUpdates, searchPattern, stageStatus } from "./lead-rules";

const now = new Date("2026-11-12T10:00:00Z");

describe("lead stage (admin audit 2026-11-12)", () => {
  it("says New only while nobody has opened or answered the lead", () => {
    expect(leadStage({ status: "new", read_at: null, replied_at: null })).toBe("new");
    expect(leadStage({ status: "new", read_at: "2026-11-12", replied_at: null })).toBe("opened");
    expect(leadStage({ status: "new", read_at: "2026-11-12", replied_at: "2026-11-12" })).toBe("contacted");
    expect(leadStage({ status: "new", read_at: null, replied_at: "2026-11-12" })).toBe("contacted");
    expect(leadStage({ status: "qualified", read_at: null, replied_at: null })).toBe("qualified");
    expect(stageStatus("opened")).toBe("new");
    expect(stageStatus("closed")).toBe("closed");
  });
});

describe("lead updates", () => {
  it("moves a New lead to Contacted when it is marked as replied, in the same update", () => {
    expect(leadUpdates({ replied: true }, "new", now)).toEqual({ replied_at: now.toISOString(), status: "contacted" });
  });

  it("leaves any other status, an explicit status and an undo alone", () => {
    expect(leadUpdates({ replied: true }, "qualified", now)).toEqual({ replied_at: now.toISOString() });
    expect(leadUpdates({ replied: true, status: "closed" }, "new", now)).toEqual({ replied_at: now.toISOString(), status: "closed" });
    expect(leadUpdates({ replied: false }, "contacted", now)).toEqual({ replied_at: null });
  });

  it("writes the other follow-up fields as before", () => {
    expect(leadUpdates({ markRead: true, adminNotes: "", handledBy: "Ann@Example.com" }, null, now)).toEqual({
      read_at: now.toISOString(),
      admin_notes: null,
      handled_by: "ann@example.com",
    });
    expect(leadUpdates({ markUnread: true, handledBy: "" }, null, now)).toEqual({ read_at: null, handled_by: null });
    expect(leadUpdates({}, "new", now)).toEqual({});
  });
});

describe("lead search", () => {
  it("matches % and _ as themselves instead of anything", () => {
    expect(searchPattern("%")).toBe('"*\\\\%*"');
    expect(searchPattern("a_b")).toBe('"*a\\\\_b*"');
  });

  it("quotes the text so commas, brackets and quotes cannot change the filter", () => {
    expect(searchPattern("sam,email.eq.x)")).toBe('"*sam,email.eq.x)*"');
    expect(searchPattern('say "hi"')).toBe('"*say \\"hi\\"*"');
  });

  it("drops PostgREST's own wildcard and empty text", () => {
    expect(searchPattern("*")).toBeNull();
    expect(searchPattern("   ")).toBeNull();
    expect(searchPattern(" bloom  salon ")).toBe('"*bloom salon*"');
  });
});
