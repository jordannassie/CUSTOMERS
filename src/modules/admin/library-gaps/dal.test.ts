// loadLibraryGaps reads only (businesses of real agencies, active library industries) and checks the admin first.
// The database is a fake here: the grouping is tested in service.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ ops: [] as string[], admin: 0, businesses: [] as { industry: string | null }[], library: [] as { industry: string }[] }));

vi.mock("@/modules/auth", () => ({
  requireAdmin: async () => {
    calls.admin++;
  },
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const data = table === "businesses" ? calls.businesses : calls.library;
      const query = {
        select: (cols: string) => (calls.ops.push(`${table}.select(${cols})`), query),
        is: (col: string, v: unknown) => (calls.ops.push(`${table}.is(${col},${v})`), query),
        eq: (col: string, v: unknown) => (calls.ops.push(`${table}.eq(${col},${v})`), query),
        then: (resolve: (r: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
      };
      return query;
    },
  }),
}));

const { loadLibraryGaps } = await import("./dal");

beforeEach(() => {
  calls.ops = [];
  calls.admin = 0;
});

describe("loadLibraryGaps (2026-10-16)", () => {
  it("counts the Other labels of live, real businesses, most used first", async () => {
    calls.businesses = [{ industry: "Florist" }, { industry: "florists" }, { industry: "IT consultant" }, { industry: "plumber" }, { industry: "Consultant" }, { industry: null }];
    calls.library = [{ industry: "plumber" }];
    expect(await loadLibraryGaps()).toEqual({
      loaded: true,
      gaps: [
        { label: "Florist", listed: false, businesses: 2, vague: false },
        { label: "Consultant", listed: false, businesses: 1, vague: true },
        { label: "IT consultant", listed: false, businesses: 1, vague: false },
      ],
    });
    expect(calls.admin).toBe(1);
    // Read only: deleted businesses and test agencies left out, active templates only.
    expect(calls.ops).toEqual([
      "businesses.select(industry, agencies!inner(is_test))",
      "businesses.is(deleted_at,null)",
      "businesses.eq(agencies.is_test,false)",
      "question_library.select(industry)",
      "question_library.eq(active,true)",
    ]);
  });

  it("says the library is not loaded instead of listing every industry when it has no active templates", async () => {
    calls.businesses = [{ industry: "plumber" }, { industry: "Florist" }];
    calls.library = [];
    expect(await loadLibraryGaps()).toEqual({ loaded: false, gaps: [] });
  });
});
