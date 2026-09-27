import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "./service";

const SECRET = "test-secret-that-is-at-least-32-characters";
const AGENCY = "7f3c2a9e-2d4b-4c1a-9a6e-1b2c3d4e5f60";

describe("unsubscribe tokens", () => {
  it("round-trips the agency and topic", () => {
    const token = signUnsubscribeToken(AGENCY, "weekly_report", SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toEqual({ agencyId: AGENCY, topic: "weekly_report" });
  });

  it("rejects a token signed with another secret", () => {
    const token = signUnsubscribeToken(AGENCY, "weekly_report", `${SECRET}-old`);
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects a token moved to another agency", () => {
    const token = signUnsubscribeToken(AGENCY, "weekly_report", SECRET);
    const other = token.replace(AGENCY, "00000000-0000-4000-8000-000000000000");
    expect(verifyUnsubscribeToken(other, SECRET)).toBeNull();
  });

  it.each([
    "",
    "v1",
    `v2.${AGENCY}.weekly_report.abc`,
    `v1.not-a-uuid.weekly_report.abc`,
    `v1.${AGENCY}.welcome.abc`,
    `v1.${AGENCY}.weekly_report.`,
    `${signUnsubscribeToken(AGENCY, "weekly_report", SECRET)}.extra`,
  ])("rejects malformed token %j", (token) => {
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("builds the page link with the token encoded", () => {
    expect(unsubscribeUrl("https://app.example/", "v1.a.b.c")).toBe("https://app.example/email/unsubscribe?token=v1.a.b.c");
  });
});
