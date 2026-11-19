import { describe, expect, it, vi } from "vitest";
import { beforeEach } from "vitest";
import { createPlaceSignals, LIMITED_PAUSE_MS, pauseAfter, PlacesUnavailable, resetPlacesPause } from "./places";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

describe("Google details for the competitors page", () => {
  beforeEach(() => resetPlacesPause());

  it("tries once more when Google is busy, then gives up with 'limited'", async () => {
    const busyOnce = vi.fn<typeof fetch>().mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({ id: ID, rating: 4.5, userRatingCount: 10 }));
    expect(await createPlaceSignals("k", busyOnce, 0)(ID)).toMatchObject({ rating: 4.5 });
    expect(busyOnce).toHaveBeenCalledTimes(2);

    const busy = vi.fn<typeof fetch>(async () => json({}, 429));
    const err = await createPlaceSignals("k", busy, 0)(ID).catch((e) => e);
    expect(err).toBeInstanceOf(PlacesUnavailable);
    expect(err.limited).toBe(true);
    expect(busy).toHaveBeenCalledTimes(2);
    // A refusal pauses lookups for a while (next describe); start this part fresh.
    resetPlacesPause();

    const missing = vi.fn<typeof fetch>(async () => json({}, 404));
    expect(await createPlaceSignals("k", missing, 0)(ID)).toBeNull();
    expect(missing).toHaveBeenCalledTimes(1);
  });
});

describe("after Google's request limit is used up", () => {
  beforeEach(() => resetPlacesPause());

  it("asks nothing for a minute, so pages stop waiting on refusals, then asks again", async () => {
    let calls = 0;
    const busy = (async () => {
      calls += 1;
      return new Response("", { status: 429 });
    }) as typeof fetch;
    let t = 1_000;
    const signals = createPlaceSignals("k", busy, 0, () => t);
    await signals(ID).catch(() => null);
    expect(calls).toBe(2);
    const err = await signals(ID).catch((e) => e);
    expect(err).toBeInstanceOf(PlacesUnavailable);
    expect(err.limited).toBe(true);
    expect(calls).toBe(2);
    t += LIMITED_PAUSE_MS + 1;
    await signals(ID).catch(() => null);
    expect(calls).toBe(4);
  });
});

describe("how long the pause after a refusal lasts (owner, 2026-11-17)", () => {
  const res = (retryAfter?: string) => ({ headers: new Headers(retryAfter === undefined ? {} : { "retry-after": retryAfter }) });

  it("is a minute when Google says nothing, never the old 10 minutes", () => {
    expect(LIMITED_PAUSE_MS).toBe(60_000);
    expect(pauseAfter(res())).toBe(60_000);
    expect(pauseAfter(res("soon"))).toBe(60_000);
  });

  it("follows Google's Retry-After, kept between 1 second and 10 minutes", () => {
    expect(pauseAfter(res("5"))).toBe(5_000);
    expect(pauseAfter(res("0.2"))).toBe(1_000);
    expect(pauseAfter(res("3600"))).toBe(600_000);
  });
});
