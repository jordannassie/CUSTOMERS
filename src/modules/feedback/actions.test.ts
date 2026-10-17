import { beforeEach, describe, expect, it, vi } from "vitest";

// "Suggest a feature" as a server action (was POST /api/geo/feature-requests): auth, input, the per-user limit.
const state = vi.hoisted(() => ({ user: null as { id: string } | null, hits: new Map<string, number>(), saved: [] as unknown[], storeDown: false }));

vi.mock("@/modules/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...real,
    requireUser: async () => {
      if (!state.user) throw new real.AuthError("not_signed_in");
      return state.user;
    },
  };
});
vi.mock("@/modules/rate-limit", async (importOriginal) => {
  const { LIMITS } = await importOriginal<typeof import("@/modules/rate-limit")>();
  return {
    LIMITS,
    // The same rule as the shared store: the count in this hour, this hit included, against the bucket's max.
    checkRateLimit: async (bucket: keyof typeof LIMITS, key: string) => {
      if (state.storeDown) return "unavailable";
      const count = (state.hits.get(`${bucket}:${key}`) ?? 0) + 1;
      state.hits.set(`${bucket}:${key}`, count);
      return count <= LIMITS[bucket].max ? "allowed" : "limited";
    },
  };
});
vi.mock("./dal", () => ({
  saveFeatureRequest: async (userId: string, input: unknown) => {
    state.saved.push({ userId, input });
    return { ok: true };
  },
}));

const { suggestFeature } = await import("./actions");
const idea = { title: "Weekly email", description: "Send my score every Monday.", pageContext: "/dashboard" };

describe("suggestFeature", () => {
  beforeEach(() => {
    state.user = { id: "user-1" };
    state.storeDown = false;
    state.hits.clear();
    state.saved = [];
  });

  it("asks a signed-out visitor to log in and saves nothing", async () => {
    state.user = null;
    expect(await suggestFeature(idea)).toEqual({ ok: false, status: 401, error: "Please log in to continue." });
    expect(state.saved).toEqual([]);
  });

  it("says what is missing or too long, as the route did", async () => {
    expect(await suggestFeature({ ...idea, title: "" })).toEqual({ ok: false, status: 400, error: "Add a short title for your idea." });
    expect(await suggestFeature({ ...idea, description: "  " })).toEqual({ ok: false, status: 400, error: "Add a sentence about what you need." });
    expect(await suggestFeature({ ...idea, title: "x".repeat(201) })).toMatchObject({ ok: false, error: "Keep the title to 200 characters or fewer." });
    expect(state.saved).toEqual([]);
  });

  it("saves the idea for the signed-in user", async () => {
    expect(await suggestFeature(idea)).toEqual({ ok: true, data: null });
    expect(state.saved).toEqual([{ userId: "user-1", input: { title: "Weekly email", description: "Send my score every Monday.", businessId: undefined, pageContext: "/dashboard" } }]);
  });

  it("refuses the 11th idea in an hour from one user, and not another user's", async () => {
    for (let i = 0; i < 10; i++) expect((await suggestFeature(idea)).ok).toBe(true);
    expect(await suggestFeature(idea)).toMatchObject({ ok: false, status: 429 });
    state.user = { id: "user-2" };
    expect((await suggestFeature(idea)).ok).toBe(true);
    expect(state.saved).toHaveLength(11);
  });

  it("says the idea wasn't sent, not that there were too many, when the limit can't be checked", async () => {
    state.storeDown = true;
    expect(await suggestFeature(idea)).toEqual({ ok: false, status: 503, error: "Your idea wasn't sent. Try again in a moment." });
    expect(state.saved).toEqual([]);
  });
});
