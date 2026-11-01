import { beforeEach, describe, expect, it, vi } from "vitest";

// "Pick your branch on Google" (step 6d): each search is a paid Places Text Search with a per-user limit, and a pick
// another business already uses is refused with a plain message instead of crashing the page.
const state = vi.hoisted(() => ({ hits: new Map<string, number>(), storeDown: false }));
const dal = vi.hoisted(() => ({
  findBranches: vi.fn(async (_agencyId: string, _businessId: string, query: string) => ({ query, choices: [], unavailable: false, searched: true })),
  saveBranch: vi.fn(async (): Promise<"saved" | "not_found" | "not_needed" | "duplicate"> => "saved"),
}));
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/auth")>();
  return { ...real, requireAgency: async () => ({ agency: { id: "agency-1" }, user: { id: "user-1" } }) };
});
vi.mock("@/modules/entitlements", () => ({ canEditTracking: () => ({ allowed: true }) }));
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
vi.mock("next/cache", () => ({ refresh }));
vi.mock("./dal", () => dal);

const { LIMITS } = await import("@/modules/rate-limit");
const { DUPLICATE_BUSINESS_TEXT } = await import("../duplicates");
const { pickBranch, searchBranches } = await import("./actions");

const businessId = "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e";
const placeId = "ChIJN1t_tDeuEmsRUsoyG83frY4";

beforeEach(() => {
  state.hits.clear();
  state.storeDown = false;
  dal.findBranches.mockClear();
  dal.saveBranch.mockClear();
  refresh.mockClear();
});

describe("branch search limit", () => {
  it(`allows ${LIMITS.branch_search.max} Google searches an hour per user, then refuses kindly`, async () => {
    for (let i = 0; i < LIMITS.branch_search.max; i++) {
      expect(await searchBranches({ businessId, query: `KFC ${i}` })).toMatchObject({ ok: true });
    }
    expect(await searchBranches({ businessId, query: "KFC F-7" })).toEqual({
      ok: false,
      status: 429,
      error: "You've searched Google for your branch a lot this hour. Try again later.",
    });
    expect(dal.findBranches).toHaveBeenCalledTimes(LIMITS.branch_search.max);
  });

  it("does not count bad input, and refuses with a try-again message when the count cannot be read", async () => {
    expect(await searchBranches({ businessId, query: "K" })).toMatchObject({ ok: false, status: 400 });
    expect(state.hits.size).toBe(0);
    state.storeDown = true;
    expect(await searchBranches({ businessId, query: "KFC F-7" })).toMatchObject({ ok: false, status: 503 });
    expect(dal.findBranches).not.toHaveBeenCalled();
  });

  it("reloads the page's data after a search that worked, so a saved 'no branch' adds the claim step", async () => {
    await searchBranches({ businessId, query: "KFC Nowhere" });
    expect(refresh).toHaveBeenCalledOnce();
    dal.findBranches.mockResolvedValueOnce({ query: "KFC", choices: [], unavailable: true, searched: true });
    await searchBranches({ businessId, query: "KFC" });
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("picking a branch", () => {
  it("says the business is already in the account when another one uses that listing (migration 067)", async () => {
    dal.saveBranch.mockResolvedValueOnce("duplicate");
    expect(await pickBranch({ businessId, placeId })).toEqual({ ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("is refused once a branch is saved, and saves only for a chain still waiting for one", async () => {
    dal.saveBranch.mockResolvedValueOnce("not_needed");
    expect(await pickBranch({ businessId, placeId })).toEqual({ ok: false, status: 409, error: "Your branch is already saved. Reload the page to see it." });
    dal.saveBranch.mockResolvedValueOnce("not_found");
    expect(await pickBranch({ businessId, placeId })).toMatchObject({ ok: false, status: 404 });
    expect(await pickBranch({ businessId, placeId })).toEqual({ ok: true, data: null });
    expect(refresh).toHaveBeenCalledOnce();
  });
});
