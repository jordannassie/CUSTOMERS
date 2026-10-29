import { describe, expect, it } from "vitest";
import type { ActionItem } from "@/modules/opportunities/board/service";
import { dropOverride, overrideKey, pruneOverrides, settleOverride, startOverride, withOverrides, type Overrides } from "./board-overrides";

const item = (id: string, over: Partial<ActionItem> = {}): ActionItem => ({
  id,
  title: `Fix ${id}`,
  impact: "medium",
  status: "suggested",
  place: "website",
  whereToApply: "Your website",
  evidence: null,
  whyItMatters: null,
  steps: [],
  claudePrompt: null,
  usesGoogle: false,
  googleHidden: false,
  source: "scan",
  createdAt: "2026-10-27T10:00:00.000Z",
  completedAt: null,
  dueDate: null,
  assignedToYou: false,
  about: [],
  ...over,
});

const move = overrideKey("move", "a");

describe("the Actions board on top of the server's list", () => {
  it("shows a move at once and keeps it while it is saved, even when a refresh brings an older list", () => {
    const first = [item("a"), item("b")];
    let o: Overrides = startOverride({}, move, "a", { status: "todo" });
    expect(withOverrides(first, o).map((i) => i.status)).toEqual(["todo", "suggested"]);
    // WaitForFixes refreshes mid-save: the server does not have the move yet, the card stays in To do.
    const refreshed = [item("a"), item("b"), item("c")];
    expect(withOverrides(refreshed, o).map((i) => [i.id, i.status])).toEqual([
      ["a", "todo"],
      ["b", "suggested"],
      ["c", "suggested"],
    ]);
    o = pruneOverrides(o, refreshed);
    expect(o[move]).toBeDefined();
  });

  it("lets the server's next list win once the save is done", () => {
    const shown = [item("a")];
    let o = settleOverride(startOverride({}, move, "a", { status: "done", completedAt: "2026-10-28T09:00:00.000Z" }), move, shown);
    expect(withOverrides(shown, o)[0]).toMatchObject({ status: "done", completedAt: "2026-10-28T09:00:00.000Z" });
    // The saved list arrives (router.refresh, revalidatePath): its values are used, with Google numbers and new cards.
    const server = [item("a", { status: "done", completedAt: "2026-10-28T09:00:01.000Z", usesGoogle: true }), item("new")];
    expect(withOverrides(server, o)).toEqual(server);
    o = pruneOverrides(o, server);
    expect(o).toEqual({});
  });

  it("drops a move that failed, so the card shows what the server has", () => {
    const shown = [item("a", { status: "todo" })];
    const o = dropOverride(startOverride({}, move, "a", { status: "done" }), move);
    expect(withOverrides(shown, o)).toEqual(shown);
  });

  it("keeps a move and an assign on one card apart", () => {
    const shown = [item("a")];
    const assign = overrideKey("assign", "a");
    let o = startOverride(startOverride({}, move, "a", { status: "in_progress" }), assign, "a", { assignedToYou: true });
    expect(withOverrides(shown, o)[0]).toMatchObject({ status: "in_progress", assignedToYou: true });
    o = dropOverride(o, assign);
    expect(withOverrides(shown, o)[0]).toMatchObject({ status: "in_progress", assignedToYou: false });
  });

  it("returns the server's list itself when nothing is pending", () => {
    const shown = [item("a")];
    expect(withOverrides(shown, {})).toBe(shown);
  });
});
