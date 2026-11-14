import { describe, expect, it } from "vitest";
import { pastLastPage, readPage } from "./paging";

// A fake list of `total` rows answering like PostgREST: a range past the end is an error.
function list(total: number) {
  const calls: [number, number][] = [];
  const run = async (from: number, to: number) => {
    calls.push([from, to]);
    if (from >= total && from > 0) return { data: null, error: { code: "PGRST103", message: "Requested range not satisfiable" }, count: null };
    return { data: Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i), error: null, count: total };
  };
  return { run, calls };
}

describe("admin paging past the last page (2026-11-12)", () => {
  it("reads the page asked for when it exists", async () => {
    const { run, calls } = list(120);
    const { result, page } = await readPage(2, 50, run);
    expect(page).toBe(2);
    expect(result.data).toHaveLength(50);
    expect(calls).toEqual([[50, 99]]);
  });

  it("shows the last page instead of an error", async () => {
    const { run } = list(120);
    const { result, page } = await readPage(99, 50, run);
    expect(page).toBe(3);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(20);
  });

  it("falls back to page 1 when everything fits on it, or the list is empty", async () => {
    expect((await readPage(2, 50, list(45).run)).page).toBe(1);
    const empty = await readPage(5, 50, list(0).run);
    expect(empty.page).toBe(1);
    expect(empty.result.data).toEqual([]);
  });

  it("knows PostgREST's out-of-range answer", () => {
    expect(pastLastPage({ code: "PGRST103" })).toBe(true);
    expect(pastLastPage({ message: "Requested range not satisfiable" })).toBe(true);
    expect(pastLastPage({ code: "42501", message: "permission denied" })).toBe(false);
    expect(pastLastPage(null)).toBe(false);
  });
});
