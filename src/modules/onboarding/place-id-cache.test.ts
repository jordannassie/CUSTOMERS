import { describe, expect, it } from "vitest";
import { cachedPlaceId, placeIdKey, rememberPlaceId } from "./place-id-cache";

describe("place ID cache", () => {
  it("remembers a match, or no match, for a day only", () => {
    const now = Date.UTC(2026, 9, 14);
    const key = placeIdKey("business-1", " Hardee's ");
    expect(cachedPlaceId(key, now)).toBeUndefined();
    rememberPlaceId(key, "ChIJ-hardees", now);
    expect(cachedPlaceId(placeIdKey("business-1", "hardee's"), now + 1_000)).toBe("ChIJ-hardees");
    expect(cachedPlaceId(key, now + 25 * 3_600_000)).toBeUndefined();
    rememberPlaceId(key, null, now);
    expect(cachedPlaceId(key, now)).toBeNull();
    expect(cachedPlaceId(placeIdKey("business-2", "Hardee's"), now)).toBeUndefined();
  });
});
