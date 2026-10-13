import { describe, expect, it } from "vitest";
import { autofill } from "./autofill";
import { toPage } from "./firecrawl";
import { COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "./fixtures";
import { contactLinesIn, footerText, showsPhone, siteContact, withFooterOnce } from "./page-contact";
import { AUTOFILL_MODEL, autofillUserMessage, MAX_PAGE_CHARS } from "./prompts/business-autofill.v1";

// firstlightaustin.com (BUG-138): Webflow's footer is a div class="footer", and main-content markdown left it out, so
// the advice said the website showed no phone number.
const FIRST_LIGHT = `<html><body><div class="hero"><h1>First Light Books</h1></div>
<script>var x = "(000) 000-0000";</script>
<div data-wf--footer--variant="base" class="footer"><div class="footer-top"><a href="/jobs" class="text-link footer">JOBS</a>
<div class="body-text less-height footer">4300 Speedway<br/>Austin, TX 78751<br/>(512) 996-1516</div>
<div class="subtitle footer">HOURS</div><div>Coffee Window at 7&nbsp;AM</div></div></div></body></html>`;

describe("footerText", () => {
  it("reads a footer div's lines and skips scripts", () => {
    expect(footerText(FIRST_LIGHT)).toBe("JOBS\n4300 Speedway\nAustin, TX 78751\n(512) 996-1516\nHOURS\nCoffee Window at 7 AM");
  });

  it("reads a <footer> and role=contentinfo, and gives nothing for a page without one", () => {
    expect(footerText("<body><main>Hi</main><footer><p>Call 0300 1234567</p></footer></body>")).toBe("Call 0300 1234567");
    expect(footerText('<body><div role="contentinfo">123 Main St</div></body>')).toBe("123 Main St");
    expect(footerText("<body><main>No footer here</main></body>")).toBe("");
    expect(footerText(null)).toBe("");
  });

  it("comes back on the scraped page from Firecrawl's raw HTML", () => {
    const page = toPage("/", { success: true, data: { markdown: "# First Light", rawHtml: FIRST_LIGHT, metadata: { statusCode: 200 } } });
    expect(page.footer).toContain("(512) 996-1516");
  });
});

describe("showsPhone", () => {
  it.each(["(512) 996-1516", "512.996.1516", "+44 20 7946 0958", "+92 51 1234567", "Call 0300 1234567"])("finds %s", (text) => {
    expect(showsPhone(text)).toBe(true);
  });

  it.each(["4300 Speedway, Austin, TX 78751", "Open 9 AM - 9 PM", "Since 2026-10-13", "Over 1,200 books"])("ignores %s", (text) => {
    expect(showsPhone(text)).toBe(false);
  });
});

describe("the footer in auto-fill", () => {
  const pages = [
    { path: "/", markdown: "# First Light", footer: "4300 Speedway\n(512) 996-1516" },
    { path: "/about", markdown: "About us", footer: "4300 Speedway\n(512) 996-1516" },
  ];

  it("goes to the model once, not on every page", () => {
    const message = autofillUserMessage("firstlightaustin.com", withFooterOnce(pages));
    expect(message.match(/<footer>/g)).toHaveLength(1);
    expect(message).toContain("(512) 996-1516");
  });

  it("counts a footer phone the model left out", () => {
    expect(siteContact({ phone: "", address: "" }, pages)).toEqual({ hasPhone: true, hasAddress: false });
    expect(siteContact({ phone: "", address: "" }, [{ path: "/", markdown: "Books" }])).toEqual({ hasPhone: false, hasAddress: false });
    expect(siteContact(null, pages)).toBeNull();
  });

  it("keeps a chain's phone and address in the saved contact, though the form leaves them out", async () => {
    const seattle = { ...COFFEE_PLACE, placeId: "ChIJ-fixture-sunrise-seattle", city: "Seattle", state: "WA" };
    const { clients } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [seattle, COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(run.siteFacts?.facts).toMatchObject({ phone: "", address: "" });
    expect(run.siteFacts?.contact).toEqual({ hasPhone: true, hasAddress: true });
  });
});

// Sites whose advice said a phone or address was missing when it was not (BUG-138 audit, 2026-10-13).
describe("contact the main content misses", () => {
  it("puts tap-to-call numbers first, ahead of a footer that opens with a map widget (atxfamilydental.com)", () => {
    const keys = Array.from({ length: 80 }, (_, i) => `<div>Key ${i} Move left by 75%</div>`).join("");
    const html = `<body><main>Dentist</main><div id="footer"><div class="map">${keys}</div><a href="tel:(512) 717-3147">Call</a></div></body>`;
    const footer = footerText(html);
    expect(footer.split("\n")[0]).toBe("Phone: (512) 717-3147");
    expect(showsPhone(footer)).toBe(true);
  });

  it("reads structured data phone and street", () => {
    const html = '<script type="application/ld+json">{"telephone":"+1-800-768-6911","address":{"streetAddress":"255 East 5th St"}}</script><body></body>';
    expect(footerText(html)).toBe("Phone: +1-800-768-6911\nAddress: 255 East 5th St");
  });

  it("strips tags whose attributes hold > (bluebottlecoffee.com)", () => {
    expect(footerText('<footer><ul class="[&>li]:!p-0 flex"><li>Locations</li></ul></footer>')).toBe("Locations");
  });

  it("keeps the phone and street lines past the cut of a long page (reveriebooks.com)", () => {
    const page = { path: "/", markdown: `${"Books and more. ".repeat(600)}\n5330 Menchaca Rd, Austin, TX 78745\nOpen daily` };
    expect(page.markdown.length).toBeGreaterThan(MAX_PAGE_CHARS);
    expect(contactLinesIn(page.markdown)).toEqual(["5330 Menchaca Rd, Austin, TX 78745"]);
    expect(autofillUserMessage("reveriebooks.com", [page])).toContain("<later-on-page>\n5330 Menchaca Rd, Austin, TX 78745\n</later-on-page>");
  });

  it("counts a near-empty page or a bot check as not read (ebookwoman.com: \"Please wait...\")", () => {
    const body = (markdown: string) => ({ success: true, data: { markdown, rawHtml: "<body></body>", metadata: { statusCode: 200 } } });
    expect(toPage("/", body("Please wait...")).status).toBe("blocked");
    expect(toPage("/", body("Menu")).status).toBe("failed");
    expect(toPage("/", body("# Sunrise Coffee\n\nRoasted in house every morning.")).status).toBe("ok");
  });
});
