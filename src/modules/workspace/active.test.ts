import { describe, expect, it } from "vitest";
import { pickActiveBusiness } from "./active";

const draft = { id: "draft", status: "onboarding" };
const live = { id: "live", status: "active" };
const older = { id: "older", status: "active" };

describe("pickActiveBusiness", () => {
  it("keeps the saved choice", () => {
    expect(pickActiveBusiness([draft, live, older], "older")).toBe(older);
    expect(pickActiveBusiness([draft, live], "draft")).toBe(draft);
  });

  it("skips a newer draft when the saved choice is gone (deleted business)", () => {
    expect(pickActiveBusiness([draft, live, older], null)).toBe(live);
    expect(pickActiveBusiness([draft, live, older], "deleted-id")).toBe(live);
  });

  it("opens the draft only when there is no set-up business", () => {
    expect(pickActiveBusiness([draft], null)).toBe(draft);
  });

  it("is null with no businesses", () => {
    expect(pickActiveBusiness([], "anything")).toBeNull();
  });
});
