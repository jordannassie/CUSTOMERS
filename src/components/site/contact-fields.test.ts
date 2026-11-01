import { describe, expect, it } from "vitest";
import { INTERESTS, interestFromParam, MESSAGE_PLACEHOLDERS } from "./contact-fields";

describe("interestFromParam", () => {
  it("keeps a support link as support, not other", () => {
    expect(interestFromParam("support")).toBe("support");
    expect(INTERESTS.map((i) => i.value)).toContain("support");
    expect(MESSAGE_PLACEHOLDERS.support).toBeTruthy();
  });

  it("maps old and unknown values", () => {
    expect(interestFromParam("sales")).toBe("ai_visibility");
    expect(interestFromParam("enterprise")).toBe("ai_visibility");
    expect(interestFromParam("nonsense")).toBe("other");
    expect(interestFromParam(null)).toBe("other");
  });
});
