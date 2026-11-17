import { describe, expect, it } from "vitest";
import { mapLimit } from "./map-limit";

describe("mapLimit", () => {
  it("never runs more than the limit at once, and keeps the order", async () => {
    let running = 0;
    let most = 0;
    const out = await mapLimit([5, 1, 4, 2, 3, 1, 2], 3, async (n) => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, n));
      running -= 1;
      return n * 10;
    });
    expect(most).toBe(3);
    expect(out).toEqual([50, 10, 40, 20, 30, 10, 20]);
  });

  it("handles no items", async () => {
    expect(await mapLimit([], 3, async (n: number) => n)).toEqual([]);
  });
});
