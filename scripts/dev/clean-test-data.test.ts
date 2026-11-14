import { describe, expect, it } from "vitest";
import { emptyTestBusinesses, isLocalUrl, isTestAgency, trialGrantFixes, type Agency } from "./clean-test-data";

// The local clean-up's rules (2026-10-15). No database: the script itself refuses anything but a local URL.
const agency = (over: Partial<Agency>): Agency => ({
  id: "a1",
  name: "Back Test Agency",
  isTest: false,
  ownerEmail: "owner@example.test",
  status: "trialing",
  trialEndsAt: "2026-10-22T10:00:00Z",
  ...over,
});

describe("clean-test-data", () => {
  it("only ever runs against a local Supabase", () => {
    expect(isLocalUrl("http://127.0.0.1:54621")).toBe(true);
    expect(isLocalUrl("http://localhost:54321")).toBe(true);
    expect(isLocalUrl("https://whjdcjoojylajtyjywhx.supabase.co")).toBe(false);
    expect(isLocalUrl("")).toBe(false);
  });

  it("counts is_test agencies and @example.test owners as test data, never a real owner", () => {
    expect(isTestAgency(agency({}))).toBe(true);
    expect(isTestAgency(agency({ isTest: true, ownerEmail: "jordan@company.com" }))).toBe(true);
    expect(isTestAgency(agency({ ownerEmail: "abcd@test.com" }))).toBe(false);
  });

  it("removes test businesses with no active questions, and keeps one still on a plan", () => {
    const agencies = [agency({ id: "t" }), agency({ id: "real", name: "abcd", ownerEmail: "abcd@test.com" })];
    const fixes = emptyTestBusinesses(agencies, [
      { id: "b1", agencyId: "t", name: "Bennu Coffee", activeQuestions: 0, onPlan: false },
      { id: "b2", agencyId: "t", name: "Harbor Dental", activeQuestions: 0, onPlan: true },
      { id: "b3", agencyId: "t", name: "Epoch Coffee", activeQuestions: 12, onPlan: false },
      { id: "b4", agencyId: "real", name: "brian-coffee-spot.com", activeQuestions: 0, onPlan: false },
    ]);
    expect(fixes.map((f) => [f.id, f.action])).toEqual([
      ["b1", "remove"],
      ["b2", "keep_on_plan"],
    ]);
  });

  it("puts a trial grant's expiry on the trial end: longer on a running trial, shorter when it runs past", () => {
    const agencies = [
      agency({ id: "running", name: "Billing Retest Agency", trialEndsAt: "2026-10-18T07:57:07Z" }),
      agency({ id: "ended", name: "Journey Test Agency", status: "past_due", trialEndsAt: "2026-10-14T10:57:24Z" }),
      agency({ id: "spent", name: "QA US Coffee Agency", status: "active", trialEndsAt: "2026-10-12T09:38:53Z" }),
      agency({ id: "early", name: "Early End", status: "active", trialEndsAt: "2026-10-20T00:00:00Z" }),
      agency({ id: "fine", name: "Fine", trialEndsAt: "2026-10-22T10:00:00Z" }),
    ];
    const fixes = trialGrantFixes(agencies, [
      { id: "g1", agencyId: "running", remaining: 28, expiresAt: "2026-10-16T07:57:07Z" },
      { id: "g2", agencyId: "ended", remaining: 64, expiresAt: "2026-10-21T10:53:18Z" },
      { id: "g3", agencyId: "spent", remaining: 0, expiresAt: "2026-10-19T06:20:28Z" },
      { id: "g4", agencyId: "early", remaining: 40, expiresAt: "2026-10-15T00:00:00Z" },
      { id: "g5", agencyId: "fine", remaining: 150, expiresAt: "2026-10-22T10:00:03Z" },
    ]);
    expect(fixes.map((f) => [f.id, f.action])).toEqual([
      ["g1", "extend"],
      ["g2", "shorten"],
      ["g3", "nothing_left"],
      ["g4", "trial_over"],
    ]);
  });
});
