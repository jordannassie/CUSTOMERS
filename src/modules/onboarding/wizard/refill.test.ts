import { describe, expect, it } from "vitest";
import { COFFEE_PLACE, COFFEE_SITE_OUTPUT } from "../fixtures";
import type { BusinessDetails } from "../schema";
import { refillDetails } from "./refill";

// What loadDetailsStep has before confirming: the typed domain is not offered as the name, nothing else is saved.
const SAVED: BusinessDetails = {
  name: "",
  industry: "",
  description: "",
  services: [],
  city: "",
  state: "",
  country: "",
  area: "",
  phone: "",
  address: "",
};

describe("refillDetails (BUG-139)", () => {
  it("gives the same details as the first visit: Google's name, industry and neighborhood with the site's services", () => {
    const bookstore = { ...COFFEE_PLACE, name: "First Light Book Shop", primaryType: "book_store", types: ["book_store", "cafe"], area: "Hyde Park" };
    const { details, industryText } = refillDetails(SAVED, { ...COFFEE_SITE_OUTPUT, name: "First Light" }, bookstore);
    expect(details).toMatchObject({ name: "First Light Book Shop", industry: "other", area: "Hyde Park", services: COFFEE_SITE_OUTPUT.services });
    expect(industryText).toBe("Bookstore");
  });

  it("fills a business without a website from its listing alone", () => {
    const { details } = refillDetails(SAVED, null, COFFEE_PLACE);
    expect(details).toMatchObject({ name: COFFEE_PLACE.name, city: COFFEE_PLACE.city, phone: COFFEE_PLACE.phone });
  });

  it("keeps what is saved when there is nothing to add, and never blanks a saved value", () => {
    const saved = { ...SAVED, city: "Austin" };
    expect(refillDetails(saved, null, null)).toEqual({ details: saved, industryText: null });
    expect(refillDetails(saved, { ...COFFEE_SITE_OUTPUT, city: "" }, null).details.city).toBe("Austin");
  });
});
