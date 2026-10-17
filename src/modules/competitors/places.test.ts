import { describe, expect, it, vi } from "vitest";
import { createPlaceSignals, PlacesUnavailable } from "./places";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

describe("Google details for the competitors page", () => {
  it("tries once more when Google is busy, then gives up with 'limited'", async () => {
    const busyOnce = vi.fn<typeof fetch>().mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({ id: ID, rating: 4.5, userRatingCount: 10 }));
    expect(await createPlaceSignals("k", busyOnce, 0)(ID)).toMatchObject({ rating: 4.5 });
    expect(busyOnce).toHaveBeenCalledTimes(2);

    const busy = vi.fn<typeof fetch>(async () => json({}, 429));
    const err = await createPlaceSignals("k", busy, 0)(ID).catch((e) => e);
    expect(err).toBeInstanceOf(PlacesUnavailable);
    expect(err.limited).toBe(true);
    expect(busy).toHaveBeenCalledTimes(2);

    const missing = vi.fn<typeof fetch>(async () => json({}, 404));
    expect(await createPlaceSignals("k", missing, 0)(ID)).toBeNull();
    expect(missing).toHaveBeenCalledTimes(1);
  });
});
