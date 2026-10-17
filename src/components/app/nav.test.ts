import { describe, expect, it } from "vitest";
import { APP_NAV, isNavActive, setupLabel } from "./nav";

const active = (pathname: string) => APP_NAV.filter((item) => isNavActive(item, pathname)).map((item) => item.label);

describe("isNavActive (BUG-094)", () => {
  it("marks Billing, not Settings, on the billing pages", () => {
    expect(active("/settings/billing")).toEqual(["Billing"]);
    expect(active("/settings/billing/plans")).toEqual(["Billing"]);
    expect(active("/settings/credits")).toEqual(["Billing"]);
  });

  it("keeps Settings for the other settings pages", () => {
    expect(active("/settings")).toEqual(["Settings"]);
    expect(active("/dashboard")).toEqual(["Overview"]);
  });
});

describe("setupLabel (step 6b)", () => {
  it("names the business being scanned during the first scan, not 'A new business'", () => {
    expect(setupLabel("/onboarding/first-scan", null, "Tim Hortons")).toBe("Tim Hortons");
  });

  it("names the draft on the other setup pages, and says 'A new business' only before it has a name", () => {
    expect(setupLabel("/onboarding/questions", "KFC", "Tim Hortons")).toBe("KFC");
    expect(setupLabel("/onboarding/website", null, "Tim Hortons")).toBe("A new business");
    expect(setupLabel("/onboarding/website", "  ", "Tim Hortons")).toBe("A new business");
  });
});
