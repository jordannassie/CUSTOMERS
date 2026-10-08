import { describe, expect, it } from "vitest";
import { APP_NAV, isNavActive } from "./nav";

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
