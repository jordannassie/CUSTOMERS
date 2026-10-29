import { describe, expect, it, vi } from "vitest";

// An ended plan is read-only (MVP_SPEC 4.4): every change on the Actions page is refused before anything is saved.
const writes = vi.hoisted(() => ({
  addAction: vi.fn(),
  assignAction: vi.fn(),
  moveAction: vi.fn(),
  updateChecklistItem: vi.fn(),
  updateStatus: vi.fn(),
}));
const agency = vi.hoisted(() => ({ status: "canceled" }));

vi.mock("@/modules/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/auth")>();
  return { ...real, requireAgency: async () => ({ agency: { id: "agency-1", status: agency.status }, user: { id: "user-1" } }) };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./board/dal", () => ({ addAction: writes.addAction, assignAction: writes.assignAction, moveAction: writes.moveAction }));
vi.mock("./dal", () => ({ updateChecklistItem: writes.updateChecklistItem, updateStatus: writes.updateStatus }));

const { addToActions, assignActionToMe, moveActionTo, setChecklistItem, setOpportunityStatus } = await import("./actions");
const { REASONS } = await import("@/modules/entitlements");

const businessId = "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e";
const actionId = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

async function everyChange() {
  return Promise.all([
    moveActionTo({ businessId, actionId, status: "done" }),
    assignActionToMe({ businessId, actionId, toMe: true }),
    setOpportunityStatus({ businessId, opportunityId: actionId, status: "done" }),
    setChecklistItem({ businessId, key: "website", done: true }),
    addToActions({ businessId, title: "Add our menu", fact: "Added by you.", whatToDo: "Add our menu", whereToApply: "Website", impact: "medium", category: "technical", source: "manual", dedupeKey: "manual:1" }),
  ]);
}

describe("Actions on an ended plan", () => {
  it("refuses every change with the read-only reason and saves nothing", async () => {
    agency.status = "canceled";
    for (const result of await everyChange()) expect(result).toEqual({ ok: false, status: 403, error: REASONS.readOnly });
    for (const write of Object.values(writes)) expect(write).not.toHaveBeenCalled();
  });

  it("still lets a past due account work on its fixes while Stripe retries the card", async () => {
    agency.status = "past_due";
    writes.moveAction.mockResolvedValueOnce(true);
    expect(await moveActionTo({ businessId, actionId, status: "done" })).toEqual({ ok: true, data: { status: "done" } });
  });
});
