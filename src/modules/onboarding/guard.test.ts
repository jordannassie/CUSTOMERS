import { beforeEach, describe, expect, it, vi } from "vitest";

// Setup's actions run before requireAgency() can be used, so they refuse a suspended or deleted agency themselves,
// and auto-fill (paid AI and Places calls) has a per-user hourly limit.
const state = vi.hoisted(() => ({
  agency: null as { id: string; name: string; status: string; isTest: boolean } | null,
  hits: new Map<string, number>(),
  storeDown: false,
}));
const writes = vi.hoisted(() => ({
  autofill: vi.fn(async () => ({ details: {}, note: null })),
  start: vi.fn(async () => ({ ok: true, businessId: "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e", autofill: { details: {}, note: null } })),
  agency: vi.fn(async () => ({ agencyId: "agency-1" })),
  place: vi.fn(async () => true),
}));

vi.mock("@/modules/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/auth")>();
  return { ...real, requireUser: async () => ({ id: "user-1", email: null }), getCurrentAgency: async () => state.agency };
});
vi.mock("@/modules/rate-limit", async (importOriginal) => {
  const { LIMITS } = await importOriginal<typeof import("@/modules/rate-limit")>();
  return {
    LIMITS,
    checkRateLimit: async (bucket: keyof typeof LIMITS, key: string) => {
      if (state.storeDown) return "unavailable";
      const count = (state.hits.get(`${bucket}:${key}`) ?? 0) + 1;
      state.hits.set(`${bucket}:${key}`, count);
      return count <= LIMITS[bucket].max ? "allowed" : "limited";
    },
  };
});
vi.mock("./website/dal", () => ({ websiteExists: async () => true }));
vi.mock("./dal", () => ({
  runBusinessAutofill: writes.autofill,
  saveBusinessPlace: writes.place,
  saveCompetitors: vi.fn(),
  lookupCompetitor: vi.fn(),
}));
vi.mock("./wizard/dal", () => ({
  saveAgency: writes.agency,
  startBusiness: writes.start,
  advanceStep: vi.fn(),
  isOwnDraft: vi.fn(),
  loadWizardState: vi.fn(),
}));
vi.mock("@/modules/notifications", () => ({ sendWelcomeEmail: vi.fn() }));

const { LIMITS } = await import("@/modules/rate-limit");
const { autofillBusiness, confirmBusinessPlace } = await import("./actions");
const { saveAgencyStep, saveWebsiteStep } = await import("./wizard/actions");

const businessId = "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e";
const agency = (status: string) => ({ id: "agency-1", name: "Blue Door", status, isTest: true });

beforeEach(() => {
  state.agency = agency("trialing");
  state.hits.clear();
  state.storeDown = false;
  for (const fn of Object.values(writes)) fn.mockClear();
});

describe("setup actions for a suspended or deleted agency", () => {
  it.each([
    ["suspended", "Your account is paused. Contact support to turn it back on."],
    ["deleted", "This account was deleted."],
  ])("refuse a %s agency before any paid call or write", async (status, error) => {
    state.agency = agency(status);
    const refused = { ok: false, status: 403, error };
    expect(await autofillBusiness({ businessId, domain: "sunrise-coffee.com" })).toEqual(refused);
    expect(await saveWebsiteStep({ domain: "sunrise-coffee.com" })).toEqual(refused);
    expect(await saveWebsiteStep({ name: "Sunrise Coffee", city: "Springfield" })).toEqual(refused);
    expect(await saveAgencyStep({ name: "Renamed", plan: null })).toEqual(refused);
    expect(await confirmBusinessPlace({ businessId, placeId: null })).toEqual(refused);
    for (const fn of Object.values(writes)) expect(fn).not.toHaveBeenCalled();
  });

  it("still let a new user with no agency yet, and a live agency, through", async () => {
    state.agency = null;
    expect(await saveAgencyStep({ name: "Blue Door", plan: null })).toEqual({ ok: true, data: null });
    state.agency = agency("canceled");
    expect(await saveWebsiteStep({ domain: "sunrise-coffee.com" })).toMatchObject({ ok: true });
    expect(await autofillBusiness({ businessId, domain: "sunrise-coffee.com" })).toMatchObject({ ok: true });
  });
});

describe("auto-fill limit", () => {
  it(`allows ${LIMITS.autofill.max} auto-fills an hour per user across both entry points, then refuses`, async () => {
    for (let i = 0; i < LIMITS.autofill.max; i++) {
      const run = i % 2 ? autofillBusiness({ businessId, domain: "sunrise-coffee.com" }) : saveWebsiteStep({ domain: "sunrise-coffee.com" });
      expect(await run).toMatchObject({ ok: true });
    }
    expect(await autofillBusiness({ businessId, domain: "sunrise-coffee.com" })).toMatchObject({ ok: false, status: 429 });
    expect(await saveWebsiteStep({ name: "Sunrise Coffee", city: "Springfield" })).toMatchObject({ ok: false, status: 429 });
    expect(writes.autofill.mock.calls.length + writes.start.mock.calls.length).toBe(LIMITS.autofill.max);
  });

  it("refuses with a try-again message when the count cannot be read", async () => {
    state.storeDown = true;
    expect(await saveWebsiteStep({ domain: "sunrise-coffee.com" })).toMatchObject({ ok: false, status: 503 });
    expect(writes.start).not.toHaveBeenCalled();
  });
});
