import { describe, expect, it } from "vitest";
import { isSameBusiness } from "./extract-match";
import type { MentionTarget } from "./mentions";

// "Autolink Services" in an answer is Autolink Motor Repair Services Ltd at autolinkservices.co.uk (live, 2026-11-19).
const autolink = { name: "Autolink Motor Repair Services Ltd", website: "https://www.autolinkservices.co.uk/", aliases: [] } as unknown as MentionTarget;

describe("a name that is the business's web address as words", () => {
  it("counts as the business", () => {
    expect(isSameBusiness("Autolink Services", autolink)).toBe(true);
    expect(isSameBusiness("AutoLink Services", autolink)).toBe(true);
  });
  it("still matches the full name and its brand, and not another garage", () => {
    expect(isSameBusiness("Autolink Motor Repair Services Ltd - Holmes Chapel MOT Centre", autolink)).toBe(true);
    expect(isSameBusiness("Autolink", autolink)).toBe(true);
    expect(isSameBusiness("H C Mot & Service", autolink)).toBe(false);
    expect(isSameBusiness("Services", autolink)).toBe(false);
  });
  it("needs the whole first label of the address, and a name long enough to be its own", () => {
    const short = { name: "AB Garage", website: "ab.com", aliases: [] } as unknown as MentionTarget;
    expect(isSameBusiness("A B", short)).toBe(false);
    expect(isSameBusiness("Autolinkservices", autolink)).toBe(true);
    // Anything more than the label is left to the name rules above.
    expect(isSameBusiness("Autolink Services Crewe", autolink)).toBe(false);
  });
});
