import { describe, expect, it } from "vitest";
import { BLOCKED_SITE_TITLE, blockedSiteDraft, withBlockedSite } from "./blocked-site";
import type { OpportunityDraft } from "./explain";

// 2026-10-16: a website that turned our reader away at setup gets the "blocks automated readers" fix every time.
const business = { name: "Bennu Coffee", city: "Austin", region: "TX", industry: "coffee_shop", domain: "bennucoffee.com", hasWebsite: true, description: null, services: [], placesId: null };
const blocked = { pages: [{ path: "/", status: "blocked" }, { path: "/about", status: "blocked" }], facts: null };
const read = { pages: [{ path: "/", status: "ok" }], facts: null };
const draft = (title: string): OpportunityDraft => ({ title, description: "d", evidence: "e", impact: "medium", category: "content", recommended_action: "1. Do it.", claude_prompt: null });

describe("the blocked website fix", () => {
  it("is added first for a website that blocked our reader", () => {
    expect(blockedSiteDraft({ business, siteFacts: blocked })?.title).toBe(BLOCKED_SITE_TITLE);
    expect(BLOCKED_SITE_TITLE).toBe("Your website blocks automated readers, so some AI tools may not be able to read it");
    const out = withBlockedSite([draft("Get listed on Yelp"), draft("Answer common questions")], { business, siteFacts: blocked }, 2);
    expect(out.map((d) => d.title)).toEqual([BLOCKED_SITE_TITLE, "Get listed on Yelp"]);
  });

  it("is not added for a site we read, one with no website, or when a fix about it is there", () => {
    expect(blockedSiteDraft({ business, siteFacts: read })).toBeNull();
    expect(blockedSiteDraft({ business: { ...business, hasWebsite: false }, siteFacts: blocked })).toBeNull();
    const already = [draft("Your website blocks automated readers, which may include AI")];
    expect(withBlockedSite(already, { business, siteFacts: blocked }, 5)).toEqual(already);
  });
});
