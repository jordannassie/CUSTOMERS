import { describe, expect, it } from "vitest";
import { pageSignals } from "./signals";

describe("pageSignals", () => {
  it("reads structured data, a form, reviews, FAQ and hours from the HTML and the text", () => {
    const html = '<script type="application/ld+json">{"@type":"Plumber","openingHours":"Mo-Fr 08:00-17:00"}</script><form>Request a quote</form>';
    expect(pageSignals(html, "## FAQ\\nAre you licensed?")).toEqual({ businessSchema: true, contactForm: true, reviews: false, faq: true, hours: true });
  });

  it("finds hours and testimonials written as text, and nothing on a plain page", () => {
    expect(pageSignals(null, "## Testimonials\nGreat work.\n\nMon to Fri 8am to 5pm")).toMatchObject({ reviews: true, hours: true, businessSchema: false });
    expect(pageSignals(null, "We fix pipes. Call us.")).toEqual({ businessSchema: false, contactForm: false, reviews: false, faq: false, hours: false });
  });
});
