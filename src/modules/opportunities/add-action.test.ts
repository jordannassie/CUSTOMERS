import { beforeEach, describe, expect, it, vi } from "vitest";

// "Add action", and "Add to Actions" on Compare and Sources: a cap on open added fixes and on the facts kept with each.
const board = vi.hoisted(() => ({
  addAction: vi.fn(async (): Promise<{ id: string; status: "todo" } | "full" | null> => ({ id: "a-1", status: "todo" })),
  assignAction: vi.fn(),
  moveAction: vi.fn(),
}));

vi.mock("@/modules/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/auth")>();
  return { ...real, requireAgency: async () => ({ agency: { id: "agency-1", status: "active" }, user: { id: "user-1" } }) };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./board/dal", () => board);
vi.mock("./dal", () => ({ updateChecklistItem: vi.fn(), updateStatus: vi.fn() }));

const { addToActions } = await import("./actions");
const { ADDED_ACTIONS_FULL, MAX_EVIDENCE_CHARS, MAX_EVIDENCE_KEYS, MAX_OPEN_ADDED_ACTIONS, addActionInput } = await import("./schema");

const input = {
  businessId: "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e",
  title: "Add our new menu to the website",
  fact: "Added by you.",
  whatToDo: "Add our new menu to the website",
  whereToApply: "Website",
  impact: "medium",
  category: "technical",
  source: "manual",
  dedupeKey: "manual:1",
  evidenceData: { place: "website" },
};

beforeEach(() => board.addAction.mockClear());

describe("adding an action", () => {
  it(`stops at ${MAX_OPEN_ADDED_ACTIONS} open added fixes with a plain message`, async () => {
    expect(MAX_OPEN_ADDED_ACTIONS).toBe(200);
    expect(await addToActions(input)).toEqual({ ok: true, data: { id: "a-1", status: "todo" } });
    board.addAction.mockResolvedValueOnce("full");
    expect(await addToActions(input)).toEqual({ ok: false, status: 409, error: ADDED_ACTIONS_FULL });
    expect(ADDED_ACTIONS_FULL).toBe("You have 200 open actions you added. Mark some done or dismiss them, then add more.");
  });

  it("keeps only a few small facts with each fix", async () => {
    expect(addActionInput.safeParse(input).success).toBe(true);
    expect(addActionInput.safeParse({ ...input, evidenceData: undefined }).success).toBe(true);
    const many = Object.fromEntries(Array.from({ length: MAX_EVIDENCE_KEYS + 1 }, (_, i) => [`k${i}`, i]));
    expect(addActionInput.safeParse({ ...input, evidenceData: many }).success).toBe(false);
    // Under the key limit but a large blob: 3 arrays of 20 long strings.
    const big = Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`list${i}`, Array.from({ length: 20 }, () => "x".repeat(120))]));
    expect(JSON.stringify(big).length).toBeGreaterThan(MAX_EVIDENCE_CHARS);
    expect(addActionInput.safeParse({ ...input, evidenceData: big }).success).toBe(false);
    // The facts Compare sends today still fit.
    const compare = { competitorId: "c-1", competitor: "Bean House", answers: 4, reason: "reviews" };
    expect(addActionInput.safeParse({ ...input, source: "comparison", evidenceData: compare }).success).toBe(true);
    expect(await addToActions({ ...input, evidenceData: many })).toMatchObject({ ok: false, status: 400 });
    expect(board.addAction).not.toHaveBeenCalled();
  });
});
