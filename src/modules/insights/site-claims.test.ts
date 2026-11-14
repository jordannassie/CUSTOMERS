import { describe, expect, it } from "vitest";
import { siteClaimIssues } from "./claims";
import { buildExplainInput, type ExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";
import { fillPlaceholders } from "./placeholders";

// Reasons shown in the dev database before BUG-140, word for word. COFFEE_SOURCES' site shows an address, no phone.
const base = buildExplainInput(COFFEE_SOURCES).input;
const withSite = (site: Partial<NonNullable<ExplainInput["yourWebsite"]>> | null): ExplainInput => ({
  ...base,
  yourWebsite: site && { ...base.yourWebsite!, ...site },
});

describe("siteClaimIssues (BUG-140)", () => {
  it.each([
    "Your website is missing basic contact and about pages",
    "Your website is missing key pages AI needs",
    "Your website is missing dedicated pages for each service",
    "The pages /about, /about-us, and /contact were not found.",
    "The /about-us page returned not found, and there are no separate pages for services such as AI Software.",
  ])("drops a missing-page claim: %s", (text) => {
    expect(siteClaimIssues([text], base)).toContain("says a page is missing, but we only open four pages");
  });

  it("drops a no-phone claim when the site showed a phone or could not be read (First Light, Epoch Coffee)", () => {
    const text = "AI assistants cannot find your phone number on your website.";
    expect(siteClaimIssues([text], withSite({ hasPhone: true }))).toHaveLength(1);
    expect(siteClaimIssues([text], withSite(null))).toHaveLength(1);
    expect(siteClaimIssues(["We read your homepage and found no phone number and no address listed."], withSite({ hasPhone: true, hasAddress: true }))).toHaveLength(2);
  });

  it("keeps the claim when the pages we read really showed none", () => {
    expect(siteClaimIssues(["Your website does not list a business address"], withSite({ hasAddress: false }))).toEqual([]);
    expect(siteClaimIssues(["Your website does not show your phone number"], withSite({ hasPhone: false }))).toEqual([]);
  });

  it("leaves other claims and businesses without a website alone", () => {
    expect(siteClaimIssues(["AI quotes other businesses' websites instead of yours", "AI cites no pages from your website"], base)).toEqual([]);
    expect(siteClaimIssues(["Your website is missing key pages AI needs"], { ...base, business: { ...base.business, hasWebsite: false } })).toEqual([]);
  });
});

describe("fillPlaceholders keeps titles like Mr. in one sentence", () => {
  it("drops the whole sentence, not the part after Mr.", () => {
    const text = "Mr. Rooter has {competitor.6f1c2d3e-0000-4000-8000-000000000001.review_count} reviews. You have fewer.";
    expect(fillPlaceholders(text, () => null)).toBe("You have fewer.");
  });
});
