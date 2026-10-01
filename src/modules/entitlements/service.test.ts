import { describe, expect, it } from "vitest";
import {
  canAddBusiness,
  canEditTracking,
  canSpendTopUps,
  canStartScan,
  maxCompetitors,
  maxQuestions,
  REASONS,
  type AgencyFacts,
  type BusinessFacts,
} from "./service";

const agency = (over: Partial<AgencyFacts> = {}): AgencyFacts => ({
  id: "agency-1",
  status: "active",
  businessCount: 1,
  balance: 100,
  ...over,
});

const business = (over: Partial<BusinessFacts> = {}): BusinessFacts => ({
  id: "business-1",
  agencyId: "agency-1",
  planName: "Starter",
  maxQuestions: 25,
  maxCompetitors: 5,
  activeQuestionCount: 0,
  competitorCount: 0,
  hasOpenScan: false,
  ...over,
});

const blockedStatuses = [
  ["past_due", REASONS.pastDue],
  ["canceled", REASONS.canceled],
  ["suspended", REASONS.paused],
  ["deleted", REASONS.paused],
] as const;

describe("canEditTracking (BUG-C)", () => {
  it("is read-only once the plan has ended", () => {
    expect(canEditTracking({ status: "canceled" })).toEqual({ allowed: false, reason: REASONS.readOnly });
    expect(canEditTracking({ status: "suspended" })).toEqual({ allowed: false, reason: REASONS.paused });
  });

  it("allows edits on a trial, a live plan, or while a payment is retried", () => {
    for (const status of ["trialing", "active", "past_due"]) expect(canEditTracking({ status }).allowed).toBe(true);
  });
});

describe("canSpendTopUps", () => {
  it.each(["trialing", "active"])("allows a %s agency", (status) => {
    expect(canSpendTopUps(agency({ status }))).toEqual({ allowed: true, reason: "" });
  });

  it.each(blockedStatuses)("blocks a %s agency", (status, reason) => {
    expect(canSpendTopUps(agency({ status }))).toEqual({ allowed: false, reason });
  });
});

describe("canAddBusiness", () => {
  it("lets a trial agency add its second business", () => {
    expect(canAddBusiness(agency({ status: "trialing", businessCount: 1 })).allowed).toBe(true);
  });

  it("stops a trial agency at 2 businesses", () => {
    expect(canAddBusiness(agency({ status: "trialing", businessCount: 2 }))).toEqual({
      allowed: false,
      reason: "Your trial includes 2 businesses. Upgrade to add more.",
    });
  });

  it("has no business limit on a paid plan", () => {
    expect(canAddBusiness(agency({ status: "active", businessCount: 40 })).allowed).toBe(true);
  });

  it.each(blockedStatuses)("blocks a %s agency", (status, reason) => {
    expect(canAddBusiness(agency({ status, businessCount: 0 }))).toEqual({ allowed: false, reason });
  });
});

describe("canStartScan", () => {
  it("allows a scan with credits, a live plan and no open job", () => {
    expect(canStartScan(agency(), business())).toEqual({ allowed: true, reason: "" });
    expect(canStartScan(agency({ status: "trialing", balance: 1 }), business()).allowed).toBe(true);
  });

  it.each([0, -12])("says out of credits at a balance of %i", (balance) => {
    expect(canStartScan(agency({ balance }), business())).toEqual({
      allowed: false,
      reason: "You're out of credits. Buy a top-up or upgrade.",
    });
  });

  it("blocks a second scan while one is queued or running", () => {
    expect(canStartScan(agency(), business({ hasOpenScan: true }))).toEqual({
      allowed: false,
      reason: REASONS.scanAlreadyQueued,
    });
  });

  it.each(blockedStatuses)("blocks a %s agency even with top-up credits left", (status, reason) => {
    expect(canStartScan(agency({ status, balance: 500 }), business())).toEqual({ allowed: false, reason });
  });

  it("blocks a business from another agency", () => {
    expect(canStartScan(agency(), business({ agencyId: "agency-2" }))).toEqual({
      allowed: false,
      reason: REASONS.notYourBusiness,
    });
    expect(canStartScan(agency(), business({ agencyId: null })).allowed).toBe(false);
  });

  it("reports the account problem before the credit problem", () => {
    expect(canStartScan(agency({ status: "canceled", balance: 0 }), business()).reason).toBe(REASONS.canceled);
  });
});

describe("maxQuestions", () => {
  it("allows up to the plan limit", () => {
    expect(maxQuestions(business({ activeQuestionCount: 24 }))).toEqual({ allowed: true, reason: "", limit: 25 });
  });

  it("stops at the plan limit with the plan name", () => {
    expect(maxQuestions(business({ activeQuestionCount: 25 }))).toEqual({
      allowed: false,
      reason: "Your Starter plan includes 25 questions per business. Upgrade or remove one to add another.",
      limit: 25,
    });
  });

  it("has no limit when the plan sets none", () => {
    expect(maxQuestions(business({ maxQuestions: null, activeQuestionCount: 500 }))).toEqual({
      allowed: true,
      reason: "",
      limit: null,
    });
  });
});

describe("maxCompetitors", () => {
  it("allows up to the plan limit", () => {
    expect(maxCompetitors(business({ competitorCount: 4 })).allowed).toBe(true);
  });

  it("stops at the plan limit with the plan name", () => {
    expect(maxCompetitors(business({ planName: "Pro", maxCompetitors: 10, competitorCount: 10 }))).toEqual({
      allowed: false,
      reason: "Your Pro plan includes 10 competitors per business. Upgrade or remove one to add another.",
      limit: 10,
    });
  });

  it("has no limit when the plan sets none", () => {
    expect(maxCompetitors(business({ maxCompetitors: null, competitorCount: 99 })).limit).toBeNull();
  });
});
