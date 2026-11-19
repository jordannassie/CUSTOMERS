import { describe, expect, it, vi } from "vitest";
import type { ExtractBusiness } from "../extract";
import type { PageResult } from "../firecrawl";
import { COFFEE_PAGES, COFFEE_SITE_OUTPUT } from "../fixtures";
import { AUTOFILL_MODEL } from "../prompts/business-autofill.v1";
import { readSiteFacts, siteFactsStale } from "./service";

const NOW = new Date("2026-10-13T12:00:00Z");
const extract = (out = COFFEE_SITE_OUTPUT) => vi.fn<ExtractBusiness>(async () => out);

describe("siteFactsStale (MVP_SPEC 7.1)", () => {
  it("is stale after 30 days or when never saved", () => {
    expect(siteFactsStale("2026-09-12T12:00:00Z", NOW)).toBe(true);
    expect(siteFactsStale("2026-09-14T12:00:00Z", NOW)).toBe(false);
    expect(siteFactsStale(null, NOW)).toBe(true);
  });
});

describe("readSiteFacts", () => {
  it("reads the site again with the auto-fill prompt and saves what the pages show", async () => {
    const run = extract();
    const facts = await readSiteFacts("sunrise-coffee.example", { scrape: async () => COFFEE_PAGES, extract: run });
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ domain: "sunrise-coffee.example", model: AUTOFILL_MODEL }));
    expect(facts).toMatchObject({ model: AUTOFILL_MODEL, domain: "sunrise-coffee.example", facts: { phone: COFFEE_SITE_OUTPUT.phone } });
    expect(facts?.contact).toEqual({ hasPhone: true, hasAddress: true });
  });

  it("keeps the saved facts when Firecrawl or the AI fails", async () => {
    const failed: PageResult[] = COFFEE_PAGES.map((p) => ({ ...p, status: "failed", markdown: "" }));
    expect(await readSiteFacts("x.example", { scrape: async () => failed, extract: extract() })).toBeNull();
    expect(await readSiteFacts("x.example", { scrape: async () => Promise.reject(new Error("429")), extract: extract() })).toBeNull();
    const down = vi.fn<ExtractBusiness>(async () => Promise.reject(new Error("credit")));
    expect(await readSiteFacts("x.example", { scrape: async () => COFFEE_PAGES, extract: down })).toBeNull();
  });

  it("saves a site that now blocks every reader as blocked, with no facts, so advice stops quoting old ones", async () => {
    const blocked: PageResult[] = COFFEE_PAGES.map((p) => ({ ...p, status: "blocked", markdown: "" }));
    const run = extract();
    const facts = await readSiteFacts("x.example", { scrape: async () => blocked, extract: run });
    expect(facts).toMatchObject({ model: null, facts: null, contact: null });
    expect(run).not.toHaveBeenCalled();
  });
});
