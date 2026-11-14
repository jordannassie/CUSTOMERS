import { describe, expect, it } from "vitest";
import { sourceBrandKey } from "./source-brand";

describe("sourceBrandKey", () => {
  it("names a site the way the report keys its fixes", () => {
    expect(sourceBrandKey("maps.google.com")).toBe("google");
    expect(sourceBrandKey("google.com.pk")).toBe("google");
    expect(sourceBrandKey("foodpanda.pk")).toBe("foodpanda");
    expect(sourceBrandKey("m.yelp.co.uk")).toBe("yelp");
    expect(sourceBrandKey("timeout.com")).toBe("timeout.com");
    expect(sourceBrandKey("ytravelblog.com")).toBe("ytravelblog.com");
  });
});
