import { describe, expect, it } from "vitest";
import { toPlaceArea } from "./competitor-places";
import { toCandidates, untypedTown } from "./places";

// The address parts Google sent for two Holmes Chapel businesses (live, 2026-11-19). The first has Holmes Chapel with
// no type, so the post town Crewe was taken as its city and every question asked about Crewe.
const UNTYPED = {
  id: "autolink",
  displayName: { text: "Autolink Motor Repair Services Ltd" },
  formattedAddress: "Cotton Filling Station, Middlewich Road, Holmes Chapel, Crewe CW4 7ET, UK",
  addressComponents: [
    { longText: "Holmes Chapel", shortText: "Holmes Chapel" },
    { longText: "Crewe", shortText: "Crewe", types: ["postal_town"] },
    { longText: "England", shortText: "England", types: ["administrative_area_level_1", "political"] },
    { longText: "United Kingdom", shortText: "GB", types: ["country", "political"] },
  ],
};
const TYPED = {
  id: "hoodtech",
  displayName: { text: "HoodTech Convertible Roof Specialists" },
  formattedAddress: "Unit A2, Manor Point, Manor Ln, Holmes Chapel, Crewe CW4 8GL, UK",
  addressComponents: [
    { longText: "Holmes Chapel", shortText: "Holmes Chapel", types: ["locality", "political"] },
    { longText: "Crewe", shortText: "Crewe", types: ["postal_town"] },
    { longText: "United Kingdom", shortText: "GB", types: ["country", "political"] },
  ],
};

describe("the town a business is in", () => {
  it("takes the untyped town before the post town, not the post town", () => {
    expect(toCandidates({ places: [UNTYPED] })[0]?.city).toBe("Holmes Chapel");
  });
  it("still prefers the locality Google names", () => {
    expect(toCandidates({ places: [TYPED] })[0]?.city).toBe("Holmes Chapel");
  });
  it("uses the post town when the address names nothing smaller", () => {
    const onlyPostTown = { ...UNTYPED, formattedAddress: "1 High Street, Crewe CW1 2AB, UK", addressComponents: UNTYPED.addressComponents.slice(1) };
    expect(toCandidates({ places: [onlyPostTown] })[0]?.city).toBe("Crewe");
  });
  it("ignores an untyped part that is not right before the post town", () => {
    expect(untypedTown([{ longText: "Cotton Filling Station" }], "Cotton Filling Station, Middlewich Road, Crewe CW4 7ET, UK", "Crewe")).toBeNull();
    expect(untypedTown(UNTYPED.addressComponents, UNTYPED.formattedAddress, null)).toBeNull();
  });
  it("counts the untyped town among a competitor's towns", () => {
    expect(toPlaceArea({ addressComponents: UNTYPED.addressComponents }).cities).toEqual(["Holmes Chapel", "Crewe"]);
  });
});
