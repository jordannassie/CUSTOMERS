import { describe, expect, it } from "vitest";
import { ExtractError } from "../extract";
import { BEAN_DOMAIN, BEAN_PAGES, BEAN_SITE_OUTPUT, BLOCKED_PAGES } from "../fixtures";
import { evidenceFor, readCompetitorSite } from "./service";

const clients = (pages = BEAN_PAGES, output = BEAN_SITE_OUTPUT) => ({
  scrape: async () => pages,
  extract: async () => output,
});

describe("readCompetitorSite", () => {
  it("keeps each service with the page it was found on and a short quote", async () => {
    const site = await readCompetitorSite(BEAN_DOMAIN, clients());
    expect(site).toMatchObject({ version: 2, status: "read", domain: BEAN_DOMAIN, hasPhone: true, hasAddress: true });
    expect(site!.services).toContainEqual({ name: "office catering", page: "/services", quote: expect.stringContaining("Office catering for teams") });
    expect(site!.services.find((s) => s.name === "coffee beans to go")!.page).toBe("/");
  });

  it("drops a service the pages never say (keepGrounded), so nothing is invented", async () => {
    const site = await readCompetitorSite(BEAN_DOMAIN, clients(BEAN_PAGES, { ...BEAN_SITE_OUTPUT, services: [...BEAN_SITE_OUTPUT.services, "tire repair"] }));
    expect(site!.services.map((s) => s.name)).not.toContain("tire repair");
  });

  it("saves a site that turns readers away as blocked, with no services", async () => {
    expect(await readCompetitorSite("blocked.example", clients(BLOCKED_PAGES))).toMatchObject({ status: "blocked", services: [], hasPhone: null });
  });

  it("gives nothing to save when the reader or the AI failed, so the owner can try again", async () => {
    expect(await readCompetitorSite(BEAN_DOMAIN, { scrape: async () => [], extract: async () => BEAN_SITE_OUTPUT })).toBeNull();
    const down = { scrape: async () => BEAN_PAGES, extract: async () => Promise.reject(new ExtractError("down", false)) };
    expect(await readCompetitorSite(BEAN_DOMAIN, down)).toBeNull();
  });
});

describe("readCompetitorSite, step 1 and 2", () => {
  it("adds what the pages show for AI tools, the claims with their quotes, its words and robots.txt", async () => {
    const site = await readCompetitorSite(BEAN_DOMAIN, { ...clients(), robots: async () => ["GPTBot"] });
    expect(site!.signals).toEqual({ businessSchema: true, contactForm: true, reviews: true, faq: true, hours: true, words: expect.any(Number), aiBlocked: ["GPTBot"] });
    expect(site!.claims).toContainEqual({ key: "years", label: "years in business", page: "/", quote: expect.stringContaining("Roasting since 2009") });
    expect(site!.claims.map((c) => c.key)).toContain("free_estimates");
    expect(site!.words).toEqual(expect.arrayContaining(["catering", "springfield", "espresso"]));
  });

  it("says nothing about robots.txt when it could not be read", async () => {
    const site = await readCompetitorSite(BEAN_DOMAIN, { ...clients(), robots: async () => Promise.reject(new Error("timeout")) });
    expect(site!.signals!.aiBlocked).toBeNull();
  });
});

describe("evidenceFor", () => {
  it("finds the first page that says it, any case, and cuts the quote at word edges", () => {
    const pages = [
      { path: "/", markdown: "Welcome" },
      { path: "/menu", markdown: "We offer **Cold Brew** on tap and [oat milk](/oat) lattes every day of the week." },
    ];
    expect(evidenceFor("cold brew", pages)).toEqual({ page: "/menu", quote: "We offer Cold Brew on tap and oat milk lattes every day of the week." });
    expect(evidenceFor("catering", pages)).toEqual({ page: null, quote: null });
  });
});
