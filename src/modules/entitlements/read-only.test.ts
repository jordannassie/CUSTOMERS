import { beforeEach, describe, expect, it, vi } from "vitest";
import { REASONS } from "./service";

// BUG-C: once a cancelled trial ends the account is read-only (MVP_SPEC 4.4), so edits to what scans track are refused.
const status = vi.hoisted(() => ({ value: "canceled" }));
const writes = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/modules/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/auth")>();
  const agency = () => ({ id: "agency-1", name: "A", status: status.value, isTest: true });
  return {
    ...real,
    requireUser: async () => ({ id: "user-1", email: "a@example.test" }),
    requireAgency: async () => ({ user: { id: "user-1", email: "a@example.test" }, agency: agency() }),
    getCurrentAgency: async () => agency(),
  };
});
vi.mock("@/modules/questions/dal", () => ({
  insertQuestion: writes,
  updateQuestionText: writes,
  updateQuestionActive: writes,
  deleteQuestion: writes,
}));
vi.mock("@/modules/settings/dal", () => ({
  updateBusinessProfile: writes,
  updateScanSettings: writes,
  updateAgencyName: writes,
  saveAgencyLogo: writes,
}));
vi.mock("@/modules/competitors/dal", () => ({ trackCompetitorByName: writes }));
vi.mock("@/modules/onboarding/dal", () => ({ saveCompetitors: writes, lookupCompetitor: writes, runBusinessAutofill: writes }));

const questions = await import("@/modules/questions");
const settings = await import("@/modules/settings");
const { trackCompetitor } = await import("@/modules/competitors");
const { saveCompetitorList } = await import("@/modules/onboarding");

const businessId = "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e";
const questionId = "0e3f6a2b-1c4d-4e5f-8a9b-0c1d2e3f4a5b";
const calls = () => [
  questions.addQuestion({ businessId, text: "best plumber in Testburg" }),
  questions.editQuestion({ businessId, questionId, text: "best plumber near Testburg" }),
  questions.setQuestionActive({ businessId, questionId, active: false }),
  questions.removeQuestion({ businessId, questionId }),
  settings.saveScanSettings({ businessId, models: ["openai"], frequency: "weekly" }),
  settings.saveBusinessProfile({ businessId, name: "Plumbing", industry: "", services: [], city: "", region: "", phone: "", website: "" }),
  trackCompetitor({ businessId, name: "Rival Plumbing" }),
  saveCompetitorList({ businessId, competitors: [] }),
];

beforeEach(() => writes.mockClear());

describe("read-only after the plan ends (BUG-C)", () => {
  it("refuses every change to tracked data and writes nothing", async () => {
    status.value = "canceled";
    for (const result of await Promise.all(calls())) {
      expect(result).toEqual({ ok: false, status: 403, error: REASONS.readOnly });
    }
    expect(writes).not.toHaveBeenCalled();
  });

  it("still lets a live account make the same changes", async () => {
    status.value = "active";
    const results = await Promise.all(calls());
    expect(results.filter((r) => !r.ok && r.error === REASONS.readOnly)).toEqual([]);
    expect(writes).toHaveBeenCalled();
  });
});
