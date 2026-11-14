import { describe, expect, it } from "vitest";
import { isAnotherBusiness } from "./service";

// 2026-10-13: changing the website during setup kept the old website's name, industry and description.
const site = { domain: "epochcoffee.com", hasWebsite: true, name: "Epoch Coffee", city: "Austin" };
const noSite = { domain: null, hasWebsite: false, name: "Push Pull", city: "Seattle" };

describe("isAnotherBusiness", () => {
  it("is another business when the website changes", () => {
    expect(isAnotherBusiness(site, { domain: "bennucoffee.com" })).toBe(true);
    expect(isAnotherBusiness(site, { domain: "epochcofee.com" })).toBe(true);
  });

  it("is the same business when the same website is entered again, however it is written", () => {
    expect(isAnotherBusiness(site, { domain: "epochcoffee.com" })).toBe(false);
    expect(isAnotherBusiness(site, { domain: "www.EpochCoffee.com" })).toBe(false);
  });

  it("is another business when the name or city of a business without a website changes", () => {
    expect(isAnotherBusiness(noSite, { name: "Push Pull", city: "Seattle" })).toBe(false);
    expect(isAnotherBusiness(noSite, { name: "Push Pull Coffee", city: "Seattle" })).toBe(true);
    expect(isAnotherBusiness(noSite, { name: "Push Pull", city: "Portland" })).toBe(true);
  });

  it("is another business when switching between a website and none", () => {
    expect(isAnotherBusiness(site, { name: "Epoch Coffee", city: "Austin" })).toBe(true);
    expect(isAnotherBusiness(noSite, { domain: "pushpull.com" })).toBe(true);
  });
});
