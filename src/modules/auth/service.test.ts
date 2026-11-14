import { describe, expect, it } from "vitest";
import { adminVerifyPathFor, isAdminEmail, isRecentRecovery, needsSecondFactor } from "./service";

const NOW = 1_800_000_000;

describe("isRecentRecovery", () => {
  it.each(["recovery", "otp"])("accepts a %s sign-in from the last hour", (method) => {
    expect(isRecentRecovery([{ method, timestamp: NOW - 120 }], NOW)).toBe(true);
    expect(isRecentRecovery([{ method: "password", timestamp: NOW - 7200 }, { method, timestamp: NOW - 3600 }], NOW)).toBe(true);
  });

  it("refuses a reset link opened more than an hour ago", () => {
    expect(isRecentRecovery([{ method: "recovery", timestamp: NOW - 3601 }], NOW)).toBe(false);
  });

  it("refuses sessions that did not come from a reset link", () => {
    expect(isRecentRecovery([{ method: "password", timestamp: NOW - 10 }], NOW)).toBe(false);
    expect(isRecentRecovery([{ method: "oauth", timestamp: NOW - 10 }], NOW)).toBe(false);
    expect(isRecentRecovery([], NOW)).toBe(false);
    expect(isRecentRecovery(undefined, NOW)).toBe(false);
    expect(isRecentRecovery(["recovery"], NOW)).toBe(false);
    expect(isRecentRecovery([{ method: "recovery", timestamp: "now" }], NOW)).toBe(false);
  });

  it("refuses a timestamp from the future", () => {
    expect(isRecentRecovery([{ method: "recovery", timestamp: NOW + 3600 }], NOW)).toBe(false);
  });
});

describe("isAdminEmail", () => {
  it("needs a confirmed address on the list", () => {
    expect(isAdminEmail("Boss@Example.test", ["boss@example.test"], true)).toBe(true);
    expect(isAdminEmail("boss@example.test", ["boss@example.test"], false)).toBe(false);
    expect(isAdminEmail("other@example.test", ["boss@example.test"], true)).toBe(false);
    expect(isAdminEmail(null, ["boss@example.test"], true)).toBe(false);
  });
});

describe("admin second factor (ADMIN_REQUIRE_MFA)", () => {
  it("asks for the app code only when it is required and the session has a password only", () => {
    expect(needsSecondFactor(true, "aal1")).toBe(true);
    expect(needsSecondFactor(true, undefined)).toBe(true);
    expect(needsSecondFactor(true, "aal2")).toBe(false);
    // Off by default: nothing changes for admins until the setting is turned on.
    expect(needsSecondFactor(false, "aal1")).toBe(false);
  });

  it("sends the admin to the verify page and back to where they were going", () => {
    expect(adminVerifyPathFor("/internal/admin/scans?status=failed")).toBe("/admin-verify?next=%2Finternal%2Fadmin%2Fscans%3Fstatus%3Dfailed");
  });
});
