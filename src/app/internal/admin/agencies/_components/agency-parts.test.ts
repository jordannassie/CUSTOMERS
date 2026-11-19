import { describe, expect, it } from "vitest";
import { statusNote, trialText } from "./agency-parts";

// The Agencies list's trial and status notes, shared by the desktop table and the phone list (admin audit 2026-11-12).
describe("trialText", () => {
  const trial = { status: "trialing", trialEndsAt: "2026-10-27T10:00:00Z" };
  it("says Ended for a trial past its end and Ends for a running one", () => {
    expect(trialText({ ...trial, displayStatus: "trial_ended" })).toBe("Ended Oct 27, 2026 UTC");
    expect(trialText({ ...trial, displayStatus: "trialing" })).toBe("Ends Oct 27, 2026 UTC");
  });
  it("shows nothing for an agency not on a trial", () => {
    expect(trialText({ status: "active", displayStatus: "active", trialEndsAt: "2026-10-27T10:00:00Z" })).toBeNull();
    expect(trialText({ status: "trialing", displayStatus: "signup_unfinished", trialEndsAt: null })).toBeNull();
  });
});

describe("statusNote", () => {
  it("gives the restore deadline first, then a missing Stripe link", () => {
    expect(statusNote({ restoreUntil: "2026-12-01T00:00:00Z", stripeLinked: false })).toBe("Restorable until Dec 1, 2026 UTC");
    expect(statusNote({ restoreUntil: null, stripeLinked: false })).toBe("Not linked to Stripe");
    expect(statusNote({ restoreUntil: null, stripeLinked: true })).toBeNull();
  });
});
